enum PROLC_Driver__ParameterDatatype {
  BOOL = 'BOOL',
  TIME = 'TIME',
}


let params = {
  Monostabile: { offset: 0, type: PROLC_Driver__ParameterDatatype.BOOL },
  Autoritenuta: { offset: 1, type: PROLC_Driver__ParameterDatatype.BOOL },
  ResetInPosizione: { offset: 2, type: PROLC_Driver__ParameterDatatype.BOOL },
  HomeOnEmergency: { offset: 3, type: PROLC_Driver__ParameterDatatype.BOOL },
  SingleShot_Alarms: { offset: 4, type: PROLC_Driver__ParameterDatatype.BOOL },
  AlarmsInManual: { offset: 5, type: PROLC_Driver__ParameterDatatype.BOOL },
  Ls_Home_Simulato: { offset: 6, type: PROLC_Driver__ParameterDatatype.BOOL },
  Ls_Work_Simulato: { offset: 7, type: PROLC_Driver__ParameterDatatype.BOOL },
  Ls_Home_Passaggio: { offset: 8, type: PROLC_Driver__ParameterDatatype.BOOL },
  Ls_Work_Passaggio: { offset: 9, type: PROLC_Driver__ParameterDatatype.BOOL },
  Ls_Home_TON: { offset: 0, type: PROLC_Driver__ParameterDatatype.TIME },
  Ls_Home_TOF: { offset: 0, type: PROLC_Driver__ParameterDatatype.TIME },
  Ls_Work_TON: { offset: 0, type: PROLC_Driver__ParameterDatatype.TIME },
  Ls_Work_TOF: { offset: 0, type: PROLC_Driver__ParameterDatatype.TIME },
  Timeout_Home: { offset: 0, type: PROLC_Driver__ParameterDatatype.TIME },
  Timeout_Work: { offset: 0, type: PROLC_Driver__ParameterDatatype.TIME },
  Timeout_Discrepancy: { offset: 0, type: PROLC_Driver__ParameterDatatype.TIME },
  Out_Home_TP: { offset: 0, type: PROLC_Driver__ParameterDatatype.TIME },
  Out_Work_TP: { offset: 0, type: PROLC_Driver__ParameterDatatype.TIME }
} satisfies Record<string, { offset: number; type: PROLC_Driver__ParameterDatatype }>;;

type ParamsMeta = typeof params;

type KeysOfType<
  M,
  Kind extends PROLC_Driver__ParameterDatatype
> = {
  [K in keyof M]: M[K] extends { type: Kind } ? K : never
}[keyof M];

type BoolKeys = KeysOfType<ParamsMeta, PROLC_Driver__ParameterDatatype.BOOL>;
type TimeKeys = KeysOfType<ParamsMeta, PROLC_Driver__ParameterDatatype.TIME>;

type PROLC_Driver_EV__Parameters =
  {
    [K in BoolKeys]?: boolean;
  } & {
    [K in TimeKeys]?: string;
  };


type AnyParamsMeta = Record<string, { offset: number; type: PROLC_Driver__ParameterDatatype }>;

type ParamsFromMeta<M extends AnyParamsMeta> =
  {
    [K in KeysOfType<M, PROLC_Driver__ParameterDatatype.BOOL>]?: boolean;
  } & {
    [K in KeysOfType<M, PROLC_Driver__ParameterDatatype.TIME>]?: string;
  };

class PROLC_Driver<M extends AnyParamsMeta> {
  constructor(
    private meta: M,
    private memory: Uint8Array,
  ) {}

  setParameters(values: ParamsFromMeta<M>) {
    // implementazione…
  }
}

const driver = new PROLC_Driver(params, new Uint8Array(128));

driver.setParameters({
  Monostabile: true,      // OK: boolean
  Timeout_Home: "1000ms", // OK: string
  
});