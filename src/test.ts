












type PROLC_Sync = Promise<void>;

abstract class PROLC_Cycle__Command {
  abstract $Execute(cycle: PROLC_Cycle): PROLC_Sync;
}

class _PROLC_Cycle_Action extends PROLC_Cycle__Command {
  private readonly _cb: (args: any) => PROLC_Sync;
  private readonly _args: any;

  constructor(cb: (args: any) => PROLC_Sync, args: any) {
    super();

    this._cb = cb;
    this._args = args;
  }

  public async $Execute(cycle: PROLC_Cycle): PROLC_Sync {
    return await this._cb(this._args);
  }
}
function PROLC_Cycle_Action<A>(cb: (args: A) => PROLC_Sync, args: A): _PROLC_Cycle_Action {
  return new _PROLC_Cycle_Action(cb, args);
}


type PROLC_Cycle__Item = PROLC_Cycle__Command | PROLC_Cycle | string;
type PROLC_Cycle__SequenceItem = PROLC_Cycle__Item | PROLC_Cycle__Item[];

class PROLC_Cycle__Step {
  private readonly _item: PROLC_Cycle__SequenceItem;

  constructor(item: PROLC_Cycle__SequenceItem) {
    this._item = item;
  }

  public async $Execute(cycle: PROLC_Cycle): PROLC_Sync {
    if (Array.isArray(this._item)) {
      let promises: PROLC_Sync[] = [];
      

    } else {
      if (this._item instanceof PROLC_Cycle__Command) {
        return await this._item.$Execute(cycle);
      }
    }
  }
}

class PROLC_Cycle {
  private readonly _items: PROLC_Cycle__SequenceItem[];
  private readonly _steps: PROLC_Cycle__Step[] = [];
  private readonly _labels: Map<string, number> = new Map<string, number>();

  private _actualStep: number = 0;
  private _isLoop: boolean = false;
  private _stepByStep: boolean = false;


  constructor(items: PROLC_Cycle__SequenceItem[]) {
    this._items = items;
    this.MapItems();
  }

  private MapItems() {
    for (let item of this._items) {
      if (typeof item === 'string' || item instanceof String) {

      } else {
        let newStep = new PROLC_Cycle__Step(item);
        this._steps.push(newStep);
      }
    }
  }

  private async DoNextStep(): Promise<boolean> {
    if (this._actualStep < 0 || this._actualStep >= this._steps.length) return false;

    let step = this._steps[this._actualStep];
    await step.$Execute(this);

    this._actualStep++;
    return this.DoNextStep();
  }


  public async $Start() {
    this._actualStep = 0;
    this.DoNextStep();
  }
  public $Stop() {}
  public $NextStep() {}
}



async function Say(args: { content: string }): PROLC_Sync {
  console.log(args.content);
}

async function Delay(args: { ms: number }): PROLC_Sync {
  return new Promise(resolve => setTimeout(resolve, args.ms) );
}


const TestCycle = new PROLC_Cycle([
  PROLC_Cycle_Action(Say, { content: 'HelloWorld_1' }),

  PROLC_Cycle_Action(Delay, { ms: 1000 }),

  PROLC_Cycle_Action(Say, { content: 'HelloWorld_2' }),
  PROLC_Cycle_Action(Say, { content: 'HelloWorld_3' })
]);

TestCycle.$Start();