
abstract class PROLC_Driver {
  private readonly _address: string;
  
  constructor(address: string) {
    this._address = address;
  }

  abstract $Setup(machine: PROLC_Machine): void;
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

  $Setup() {
    throw new Error("Method not implemented.");
  }

  // public LS_Work: boolean;
  // public LS_Home: boolean;

  public async GoWork(args: {}): PROLC_Sync {}
  public async GoHome(args: {}): PROLC_Sync {}
}



type PROLC_Sync = Promise<void>;

abstract class PROLC_Cycle__Timeout {
  protected _succeded: boolean = false;

  abstract $Watch(cycle: _PROLC_Cycle): Promise<void>;
  public $MarkAsSucceded() {
    this._succeded = true;
  }
}

class PROLC_Cycle__TimeoutAlarm extends PROLC_Cycle__Timeout {
  private readonly _ms: number;
  private readonly _errMessage: string;

  constructor(ms: number, errMessage: string) {
    super();
    this._ms = ms;
    this._errMessage = errMessage;
  }

  async $Watch(cycle: _PROLC_Cycle): Promise<void> {
    this._succeded = false;
    await new Promise(resolve => setTimeout(resolve, this._ms) );

    if (!this._succeded) {
      cycle.manager.machine.$ReportError(this._errMessage);
    }
  }
}

class PROLC_Cycle__TimeoutJump extends PROLC_Cycle__Timeout {
  private readonly _ms: number;
  private readonly _label: string;

  constructor(ms: number, label: string) {
    super();
    this._ms = ms;
    this._label = label;
  }

  async $Watch(cycle: _PROLC_Cycle): Promise<void> {
    this._succeded = false;
    await new Promise(resolve => setTimeout(resolve, this._ms) );

    if (!this._succeded) {
      cycle.JumpLabel(this._label);
    }
  }
}

abstract class PROLC_Cycle__Command {
  protected _timeout?: PROLC_Cycle__Timeout = undefined;

  abstract $Execute(cycle: _PROLC_Cycle): PROLC_Sync;

  public WithTimeoutAlarm(ms: number, errMessage: string): this {
    this._timeout = new PROLC_Cycle__TimeoutAlarm(ms, errMessage);
    return this;
  }

  public WithTimeoutDo(ms: number, seq: PROLC_Cycle__SequenceItem[]): this {
    return this;
  }

  public WithTimeoutJump(ms: number, label: string): this {
    this._timeout = new PROLC_Cycle__TimeoutJump(ms, label);
    return this;
  }
}

class _PROLC_Cycle_Action<A> extends PROLC_Cycle__Command {
  private readonly _cb: (args: A) => PROLC_Sync;
  private readonly _args: A | (() => A);

  constructor(cb: (args: A) => PROLC_Sync, args: A | (() => A)) {
    super();

    this._cb = cb;
    this._args = args;
  }

  public async $Execute(cycle: _PROLC_Cycle): PROLC_Sync {
    let argsValue = (this._args instanceof Function) ? this._args() : this._args;
    if (this._timeout) {
      let ret = await Promise.race([
        this._timeout.$Watch(cycle),
        this._cb(argsValue)
      ]);
      this._timeout?.$MarkAsSucceded();
      return ret;
    } else {
      return await this._cb(argsValue);
    }
  }
}
function PROLC_Cycle_Action<A>(cb: (args: A) => PROLC_Sync, args: A | (() => A)): _PROLC_Cycle_Action<A> {
  return new _PROLC_Cycle_Action<A>(cb, args);
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
  private readonly _machine: PROLC_Machine;
  public get machine(): PROLC_Machine {
    return this._machine;
  }

  private readonly _cycles: Map<string, _PROLC_Cycle> = new Map<string, _PROLC_Cycle>();

  constructor(machine: PROLC_Machine, cycles: _PROLC_Cycle[]) {
    this._machine = machine;
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

  public $PauseAll() {
    for (let [cycleName, cycle] of this._cycles) {
      cycle.$Pause();
    }
  }
  public $StopAll() {
    for (let [cycleName, cycle] of this._cycles) {
      cycle.$Stop();
    }
  }
}

abstract class PROLC_Machine {
  private readonly _name: string;
  public get name(): string {
    return this._name;
  }

  private readonly _cyclesManager: _PROLC_CyclesManager;
  public get cyclesManager(): _PROLC_CyclesManager {
    return this._cyclesManager;
  }

  private readonly _interface: PROLC_Interface;

  private readonly _drivers: PROLC_Driver[] = [];

  private readonly _dataStorages: Map<string, PROLC_DataStorage<any>> = new Map<string, PROLC_DataStorage<any>>();

  constructor(name: string) {
    this._name = name;
    this._cyclesManager = new _PROLC_CyclesManager(this, []);
    this._interface = new PROLC_Interface(this._cyclesManager);

    this.SetupDrivers();
  }

  private SetupDrivers() {
    for (let driver of this._drivers) {
      driver.$Setup(this);
    }
  }

  public $RegisterDataStorages(storages: { [key: string]: PROLC_DataStorage<any> }) {
    for (let storageName in storages) {
      let storageItem = storages[storageName];

      if (this._dataStorages.has(storageName)) throw `DataStorage named '${storageName}' already registered for machine named '${this.name}'.`;
      this._dataStorages.set(storageName, storageItem);
    }
  }

  public $ReportWarning(msg: string) {
    console.log(`> !   WARNING: ${msg}`); // TODO:
  }
  public $ReportError(msg: string) {
    this._cyclesManager.$PauseAll();
    console.log(`> !!  ERROR: ${msg}`); // TODO:
  }
  public $ReportCritical(msg: string) {
    this._cyclesManager.$StopAll();
    console.log(`> !!! CRITICAL: ${msg}`); // TODO:
  }
}

class PROLC_MachineBasic extends PROLC_Machine {
  constructor(name: string) {
    super(name);
  }
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
      let foundCycle = this._manager.$GetCycle(cycleName);
      if (!foundCycle) return res.status(404).json({ message: `Cycle named '${cycleName}' not found.` });

      const actionName = String(req.params.action_name);
      let foundAction = foundCycle.InterfaceActions.get(actionName);
      if (!foundAction) return res.status(404).json({ message: `Unable to find Interface Action named '${actionName}' in cycle '${cycleName}'.` });

      foundAction.apply(foundCycle);

      res.json();
    });

    this.app.post('/prolc/cycle/:cycle_name/update_code', (req: Request, res: Response) => {
      const cycleName = String(req.params.cycle_name);
      let foundCycle = this._manager.$GetCycle(cycleName);
      if (!foundCycle) return res.status(404).json({ message: `Cycle named '${cycleName}' not found.` });
      if (!foundCycle.IsHalted) return res.status(404).json({ message: `Cycle named '${cycleName}' is running.` });

      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ message: 'Code is required' });
      }

      let codeObj = eval(code); // TODO: Replace with more "safe" way
      if (!Array.isArray(codeObj)) return res.status(404).json({ message: `Update Code should return an Array.` });

      foundCycle.$UpdateItems(codeObj);

      res.status(201).json();
    });
  }

}


class _PROLC_Cycle {
  private readonly _name: string;
  public get name(): string {
    return this._name;
  }

  private _manager?: _PROLC_CyclesManager;
  public get manager(): _PROLC_CyclesManager {
    if (!this._manager) throw `Cycle manager not defined for cycle named '${this.name}'.`;
    return this._manager;
  }

  private _items: PROLC_Cycle__SequenceItem[];
  private readonly _steps: PROLC_Cycle__Step[] = [];
  private readonly _labels: Map<string, number> = new Map<string, number>();

  private _stopRequest: boolean = false;
  private _actualStep: number = -1;
  private _isLoop: boolean = false;
  private _stepByStep: boolean = false;
  private _debug: boolean = false;

  constructor(name: string, items: PROLC_Cycle__SequenceItem[]) {
    this._name = name;
    this._items = items.slice();
    this.MapItems();
  }

  public $UpdateItems(items: PROLC_Cycle__SequenceItem[]) {
    if (!this.IsHalted) return;

    this._items.splice(0, this._items.length);
    this._steps.splice(0, this._steps.length);
    this._labels.clear();

    this._items = items.slice();
    this.MapItems();
  }

  public get IsHalted() {
    return (this._actualStep < 0) || (this._stepByStep);
  }

  private MapItems() {
    for (let item of this._items) {
      if (typeof item === 'string' || item instanceof String) {
        let label = item.toString().toUpperCase();
        if (this._labels.has(label)) throw `Label '${label}' already exists.`;
        this._labels.set(label, this._steps.length);
      } else {
        let newStep = new PROLC_Cycle__Step(item);
        this._steps.push(newStep);
      }
    }
  }

  private async DoNextStep(): Promise<boolean> {
    if (this._stopRequest) {
      this._stopRequest = false;
      this._actualStep = -1;
      return false; 
    }

    if (this._actualStep < 0 || this._actualStep >= this._steps.length) return false;

    let step = this._steps[this._actualStep];

    this._actualStep++;
    let stepRet = step.$Execute(this);

    await stepRet;

    if (this._stepByStep) 
      return true;
    else
      return this.DoNextStep();
  }

  private Step() {
    this.DoNextStep().catch((msg: string) => this.manager.machine.$ReportCritical(msg));
  }

  public $Register(machine: PROLC_Machine) {
    machine.cyclesManager.$RegisterCycle(this);
    this._manager = machine.cyclesManager;
  }

  public JumpLabel(label: string) {
    let saneLabel = label.toUpperCase();
    if (!this._labels.has(saneLabel)) throw `Label '${saneLabel}' does not exists.`;
    this._actualStep = this._labels.get(saneLabel)!;
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
    this._stepByStep = false;
    this._stopRequest = false;
    this.Step();
  }
  public $Stop() {
    if (this._stepByStep) {
      this._actualStep = -1;
      this._stopRequest = false;
    } else {
      this._stopRequest = true;
    }
  }

  public $Pause() {
    this._stepByStep = true;
  }
  public $Continue() {
    this._stepByStep = false;
    this.Step();
  }
  public $NextStep() {
    this._stepByStep = true;
    this.Step();
  }
}
function PROLC_Cycle(name: string, items: PROLC_Cycle__SequenceItem[]) {
  return new _PROLC_Cycle(name, items);
}


class PROLC_DataStorage<D> {
  // private _name: string;
  // public get name(): string {
  //   return this._name;
  // }

  private readonly _data: D;
  public get data(): D {
    return this._data;
  }

  constructor(init: D) {
    this._data = init;
  }
}

async function Say(args: { content: string }): PROLC_Sync {
  console.log(args.content);
}

async function Delay(args: { ms: number }): PROLC_Sync {
  return new Promise(resolve => setTimeout(resolve, args.ms) );
}


let MainMachine = new PROLC_MachineBasic('MainMachine');

let GlobalData = new PROLC_DataStorage({
  cnt: 0
});

MainMachine.$RegisterDataStorages({
  GlobalData
});

PROLC_Cycle('TestCycle', [
  'start',
  PROLC_Cycle_Action(async () => { GlobalData.data.cnt++ }, { }),
  PROLC_Cycle_Action(Say, () => { return { content: `HelloWorld_${GlobalData.data.cnt}` } }).WithTimeoutAlarm(1000, 'Error message 1'),

  PROLC_Cycle_Action(Delay, { ms: 1000 }),//.WithTimeoutJump(100, 'error_timeout'), //.WithTimeoutAlarm(1000, 'Error message 2'),

  PROLC_Cycle_Action(Say, { content: 'HelloWorld_2' }).WithTimeoutDo(2000, [ PROLC_Cycle_Jump('start') ]),
  PROLC_Cycle_Action(Say, { content: 'HelloWorld_3' }),

  [
    PROLC_Cycle_Action(Say, { content: 'ABC' }),
    PROLC_Cycle_Action(Delay, { ms: 1000 }).WithTimeoutJump(1200, 'error_timeout'),
    PROLC_Cycle_Action(Say, { content: 'DEF' }),
  ],

  PROLC_Cycle_Jump('start'),

  'error_timeout',
  PROLC_Cycle_Action(Say, { content: 'Error_timeout' }),

]).$Register(MainMachine);
