
abstract class PROLC_Driver {
  private readonly _address: string;
  
  constructor(address: string) {
    this._address = address;
  }

  protected abstract $Setup(): void;
}


type PROLC_Driver_EV__Parameters = {
  Monostabile?: boolean,
  Autoritenuta?: boolean,
  ResetInPosizione?: boolean,
  HomeOnEmergency?: boolean,
  SingleShot_Alarms?: boolean,
  AlarmsInManual?: boolean,
  Ls_Home_Simulato?: boolean,
  Ls_Work_Simulato?: boolean,
  Ls_Home_Passaggio?: boolean,
  Ls_Work_Passaggio?: boolean,
  Ls_Home_TON?: String,
  Ls_Home_TOF?: String,
  Ls_Work_TON?: String,
  Ls_Work_TOF?: String,
  Timeout_Home?: String,
  Timeout_Work?: String,
  Timeout_Discrepancy?: String,
  Out_Home_TP?: String,
  Out_Work_TP?: String
};
class PROLC_Driver_EV extends PROLC_Driver {
  constructor(address: string, params: PROLC_Driver_EV__Parameters) {
    super(address);
  }

  protected $Setup() {
    throw new Error("Method not implemented.");
  }

  // public LS_Work: boolean;
  // public LS_Home: boolean;

  public async GoWork(args: {}): PROLC_Sync {}
  public async GoHome(args: {}): PROLC_Sync {}
}



type PROLC_Sync = Promise<void>;

abstract class PROLC_Cycle__Command {
  abstract $Execute(cycle: _PROLC_Cycle): PROLC_Sync;
}

class _PROLC_Cycle_Action extends PROLC_Cycle__Command {
  private readonly _cb: (args: any) => PROLC_Sync;
  private readonly _args: any;

  constructor(cb: (args: any) => PROLC_Sync, args: any) {
    super();

    this._cb = cb;
    this._args = args;
  }

  public async $Execute(cycle: _PROLC_Cycle): PROLC_Sync {
    return await this._cb(this._args);
  }
}
function PROLC_Cycle_Action<A>(cb: (args: A) => PROLC_Sync, args: A): _PROLC_Cycle_Action {
  return new _PROLC_Cycle_Action(cb, args);
}


class _PROLC_Cycle_Jump extends PROLC_Cycle__Command {
  private readonly _label: string;

  constructor(label: string) {
    super();
    this._label = label;
  }

  public async $Execute(cycle: _PROLC_Cycle): PROLC_Sync {
    cycle.JumpLabel(this._label);
  }
}
function PROLC_Cycle_Jump(label: string): _PROLC_Cycle_Jump {
  return new _PROLC_Cycle_Jump(label);
}


type PROLC_Cycle__Item = PROLC_Cycle__Command | _PROLC_Cycle | string;
type PROLC_Cycle__SequenceItem = PROLC_Cycle__Item | PROLC_Cycle__Item[];

class PROLC_Cycle__Step {
  private readonly _item: PROLC_Cycle__SequenceItem;

  constructor(item: PROLC_Cycle__SequenceItem) {
    this._item = item;
  }

  public async $Execute(cycle: _PROLC_Cycle): PROLC_Sync {
    if (Array.isArray(this._item)) {
      let promises: PROLC_Sync[] = [];

      for (let subItem of this._item) {
        if (subItem instanceof PROLC_Cycle__Command) {
          promises.push(subItem.$Execute(cycle));
        }
      }

      return (await Promise.all(promises))[0];
    } else {
      if (this._item instanceof PROLC_Cycle__Command) {
        return await this._item.$Execute(cycle);
      }
    }
  }
}

class _PROLC_CyclesManager {
  private readonly _cycles: Map<string, _PROLC_Cycle> = new Map<string, _PROLC_Cycle>();

  constructor(cycles: _PROLC_Cycle[]) {
    for (let cycle of cycles) {
      this.$RegisterCycle(cycle);
    }
  }

  public $RegisterCycle(cycle: _PROLC_Cycle) {
    if (this._cycles.has(cycle.name)) throw `Cycle named '${cycle.name}' already registered.`;
    this._cycles.set(cycle.name, cycle);
  }

  public $GetCycle(name: string): _PROLC_Cycle | undefined {
    return this._cycles.get(name);
  }
}
function PROLC_CyclesManager(cycles: _PROLC_Cycle[]) {
  return new _PROLC_CyclesManager(cycles);
}


import express, { Express, Request, Response } from 'express';

class PROLC_Interface {
  private readonly app: Express;
  private readonly _manager: _PROLC_CyclesManager;

  constructor(manager: _PROLC_CyclesManager, port: number = 3775) {
    this._manager = manager;

    this.app = express();
    this.app.use(express.json());
    this.SetupEndpoints();
    this.app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  }

  private SetupEndpoints() {
    this.app.get('/prolc/cycle/:cycle_name/action/:action_name', (req: Request, res: Response) => {
      const cycleName = String(req.params.cycle_name);
      const actionName = String(req.params.action_name);
      let foundCycle = this._manager.$GetCycle(cycleName);
      
      if (!foundCycle) return res.status(404).json({ message: `Cycle named '${cycleName}' not found.` });

      let foundAction = foundCycle.InterfaceActions.get(actionName);

      if (!foundAction) return res.status(404).json({ message: `Unable to find Interface Action named '${actionName}' in cycle '${cycleName}'.` });
      foundAction.apply(foundCycle);

      res.json();
    });
  }

}


class _PROLC_Cycle {
  private readonly _name: string;
  public get name(): string {
    return this._name;
  }

  private readonly _items: PROLC_Cycle__SequenceItem[];
  private readonly _steps: PROLC_Cycle__Step[] = [];
  private readonly _labels: Map<string, number> = new Map<string, number>();

  private _stopRequest: boolean = false;
  private _actualStep: number = 0;
  private _isLoop: boolean = false;
  private _stepByStep: boolean = false;
  private _debug: boolean = false;

  constructor(name: string, items: PROLC_Cycle__SequenceItem[]) {
    this._name = name;
    this._items = items;
    this.MapItems();
  }

  private MapItems() {
    for (let item of this._items) {
      if (typeof item === 'string' || item instanceof String) {
        let label = item.toString();
        if (this._labels.has(label)) throw `Label '${label}' already exists.`;
        this._labels.set(label, this._steps.length - 1);
      } else {
        let newStep = new PROLC_Cycle__Step(item);
        this._steps.push(newStep);
      }
    }
  }

  private async DoNextStep(): Promise<boolean> {
    if (this._stopRequest) {
      this._stopRequest = false;
      return false; 
    }

    if (this._actualStep < 0 || this._actualStep >= this._steps.length) return false;

    let step = this._steps[this._actualStep];

    let stepRet = step.$Execute(this);
    this._actualStep++;

    await stepRet;

    if (this._stepByStep) 
      return true;
    else
      return this.DoNextStep();
  }

  public $Register(manager: _PROLC_CyclesManager) {
    manager.$RegisterCycle(this);
  }

  public JumpLabel(label: string) {
    if (!this._labels.has(label)) throw `Label '${label}' does not exists.`;
    this._actualStep = this._labels.get(label)!;
  }

  public InterfaceActions: Map<string, () => void> = new Map<string, () => void>([
    ['Start', this.$Start],
    ['Stop', this.$Stop],
    ['Pause', this.$Pause],
    ['Continue', this.$Continue],
    ['NextStep', this.$NextStep]
  ]);

  public async $Start() {
    this._actualStep = 0;
    this.DoNextStep();
  }
  public $Stop() {
    this._stopRequest = true;
  }

  public $Pause() {
    this._stepByStep = true;
  }
  public $Continue() {
    this._stepByStep = false;
    this.DoNextStep();
  }
  public $NextStep() {
    this._stepByStep = true;
    this.DoNextStep();
  }
}
function PROLC_Cycle(name: string, items: PROLC_Cycle__SequenceItem[]) {
  return new _PROLC_Cycle(name, items);
}


async function Say(args: { content: string }): PROLC_Sync {
  console.log(args.content);
}

async function Delay(args: { ms: number }): PROLC_Sync {
  return new Promise(resolve => setTimeout(resolve, args.ms) );
}


let MainCycleManager = PROLC_CyclesManager([
]);
let MainInterface = new PROLC_Interface(MainCycleManager);

PROLC_Cycle('TestCycle', [
  'start',
  PROLC_Cycle_Action(Say, { content: 'HelloWorld_1' }),

  PROLC_Cycle_Action(Delay, { ms: 1000 }),

  PROLC_Cycle_Action(Say, { content: 'HelloWorld_2' }),
  PROLC_Cycle_Action(Say, { content: 'HelloWorld_3' }),

  [
    PROLC_Cycle_Action(Say, { content: 'ABC' }),
    PROLC_Cycle_Action(Delay, { ms: 1000 }),
    PROLC_Cycle_Action(Say, { content: 'DEF' }),
  ],

  PROLC_Cycle_Jump('start')
]).$Register(MainCycleManager);
