
abstract class PROLC_Driver {
  protected abstract $Setup();
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
    super();
  }

  protected $Setup() {
    throw new Error("Method not implemented.");
  }

  public LS_Work: boolean;
  public LS_Home: boolean;

  public async GoWork(args: {}): PROLC_Sync {}
  public async GoHome(args: {}): PROLC_Sync {}
}



type PROLC_Driver_InputsModule__Parameters = {
  TON_Delays?: string[],
  TOF_Delays?: string[]
};
class PROLC_Driver_InputsModule<M extends Record<string, number>> extends PROLC_Driver {
  public Values: { [K in keyof M]: boolean };
  public Inputs: { [K in keyof M]: () => PROLC_Sync };

  constructor(address: string, params: PROLC_Driver_InputsModule__Parameters, mapping: M) {
    super();
  }

  protected $Setup() {
    throw new Error("Method not implemented.");
  }

  public async Read(args: { index: number }): PROLC_Sync {}
}


class PROLC_Lib_Timer {
  private _ms: number;

  constructor(ms: number) {
    this._ms = ms;
  }


  static async Delay(args: { ms: number }): PROLC_Sync {



  }

}


type PROLC_Sync = Promise<{ res: boolean }>;

abstract class PROLC_Cycle__Command {

}

abstract class PROLC_Cycle__Feedback {

}

class _PROLC_Cycle_WaitUntil extends PROLC_Cycle__Command {
  constructor(cb: Function, args: any) {
    super();
  }
}
function PROLC_Cycle_WaitUntil<A>(cb: (args: A) => PROLC_Sync, args: A): _PROLC_Cycle_WaitUntil {
  return new _PROLC_Cycle_WaitUntil(cb, args);
}

class _PROLC_Cycle_Parallel extends PROLC_Cycle__Command {

}


class _PROLC_Cycle_WaitAll extends PROLC_Cycle__Command {

}
function PROLC_Cycle_WaitAll(...items: PROLC_Cycle__Item[]): _PROLC_Cycle_WaitAll {
}


class _PROLC_Cycle_WaitAny extends PROLC_Cycle__Command {

}
function PROLC_Cycle_WaitAny(...items: PROLC_Cycle__Item[]): _PROLC_Cycle_WaitAny {
}


class _PROLC_Cycle_JumpIf extends PROLC_Cycle__Command {
  constructor(checker: () => Boolean, label: string) {
    super();
    
  }
}
function PROLC_Cycle_JumpIf(checker: () => Boolean, label: string): _PROLC_Cycle_JumpIf {
  return new _PROLC_Cycle_JumpIf(checker, label);
}


class _PROLC_Cycle_DoIf extends PROLC_Cycle__Command {
  constructor(checker: () => Boolean, trueSeq: PROLC_Cycle__Sequence) {
    super();
    
  }
}
function PROLC_Cycle_DoIf(checker: () => Boolean, trueSeq: PROLC_Cycle__Sequence): _PROLC_Cycle_DoIf {
  return new _PROLC_Cycle_DoIf(checker, trueSeq);
}


class _PROLC_Cycle_Switch extends PROLC_Cycle__Command {
  constructor(checker: () => Boolean, trueSeq: PROLC_Cycle__Sequence, falseSeq: PROLC_Cycle__Sequence) {
    super();
    
  }
}
function PROLC_Cycle_Switch(checker: () => Boolean, seqs: { true: PROLC_Cycle__Sequence, false: PROLC_Cycle__Sequence }): _PROLC_Cycle_Switch {
  return new _PROLC_Cycle_Switch(checker, seqs.true, seqs.false);
}


class _PROLC_Cycle_Action extends PROLC_Cycle__Command {
  constructor(cb: Function, args: any) {
    super();

  }
}
function PROLC_Cycle_Action<A>(cb: (args: A) => PROLC_Sync, args: A): _PROLC_Cycle_Action {
  return new _PROLC_Cycle_Action(cb, args);
}


class PROLC_Cycle__Label extends PROLC_Cycle__Command {
  constructor(label: string) {
    super();

  }
}

type PROLC_Cycle__Item = PROLC_Cycle__Command | PROLC_Cycle__Feedback | _PROLC_Cycle | PROLC_Cycle__Label | string;
type PROLC_Cycle__Sequence = PROLC_Cycle__Item | PROLC_Cycle__Item[];


class PROLC_Cycle {
  private _isLoop: boolean = false;
  private _stepByStep: boolean = false;

  constructor(items: PROLC_Cycle__Sequence) {

  }

  public Start() {}
  public Stop() {}
  public NextStep() {}
}

class PROLC_Logic {

}

class PROLC_Machine {
  constructor(name: string, resetCycle: _PROLC_Cycle, autoCycle: _PROLC_Cycle) {

  }
}


const Y1_STx = new PROLC_Driver_EV('1000.12', { Timeout_Home: '2s', Timeout_Work: '10s' });
const Y2_STx = new PROLC_Driver_EV('1000.58', { Timeout_Home: '5s', Timeout_Work: '5s', Ls_Home_Simulato: true, Ls_Work_Simulato: true });
const Y3_STx = new PROLC_Driver_EV('1000.104', { Timeout_Home: '5s', Timeout_Work: '5s', Ls_Home_Simulato: true, Ls_Work_Simulato: true });
const D1_STx = new PROLC_Driver_InputsModule('1000.150', { }, { SQ1_STx: 0, SQ2_STx: 1, SQ3_STx: 2, SQ4_STx: 3 });


const ResetCycle = new _PROLC_Cycle([
  PROLC_Cycle_WaitUntil(D1_STx.Inputs.SQ1_STx, { }),

  [
    PROLC_Cycle_WaitUntil(D1_STx.Inputs.SQ1_STx, { }),
    PROLC_Cycle_WaitUntil(D1_STx.Inputs.SQ2_STx, { })
  ],

  'LBL_Start',
  PROLC_Cycle_Action(Y1_STx.GoWork, {}),
  PROLC_Cycle_WaitUntil(PROLC_Lib_Timer.Delay, { ms: 1000 }),
  PROLC_Cycle_Action(Y1_STx.GoHome, {}),

  [
    PROLC_Cycle_DoIf(() => D1_STx.Values.SQ2_STx, [
      PROLC_Cycle_Action(Y2_STx.GoWork, {}),
    ]),
    PROLC_Cycle_DoIf(() => D1_STx.Values.SQ3_STx, [
      PROLC_Cycle_Action(Y3_STx.GoWork, {}),
      PROLC_Cycle_WaitUntil(PROLC_Lib_Timer.Delay, { ms: 1000 }),
      PROLC_Cycle_Action(Y3_STx.GoHome, {}),
    ])
  ],

  PROLC_Cycle_Switch(
    () => D1_STx.Values.SQ4_STx,
    {
      true: [],
      false: [] 
    }
  ),

  [
    PROLC_Cycle_Action(Y2_STx.GoHome, {}),
    PROLC_Cycle_Action(Y3_STx.GoHome, {}),
  ],

  'PushToScraps',
  PROLC_Cycle_Action(Y2_STx.GoWork, {}),


  'PushToGoods',
  PROLC_Cycle_Action(Y2_STx.GoHome, {}),
]);