### v0.1
  - [ ] Generic timeout for cycle
    PROLC_Cycle(name, items, timeout)
  - [ ] Custom timeout for cycle
    [
      ...,

      PROLC_Cycle_Action(Say, { content: 'HelloWorld_1' }).WithTimeoutAlarm(1000, 'Error message'),

      ...
    ]
  - [ ] Global data storage like DBs for siemens
  - [ ] Global alarm list storage for easy discovery
  - [ ] User function / cycles like FANUC Robot
  - [ ] Branches ALL (all must finish before exit)
  - [ ] Branches ANY (any must finish before exit)
  - [ ] Conditions