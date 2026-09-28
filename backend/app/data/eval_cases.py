"""Labelled evaluation gold set (DEMO_SYNTHETIC). Each case has procurement text
and the standards a human labelled as relevant, for measuring retrieval quality."""

EVAL_CASES: list[dict] = [
    {
        "name": "pump-set", "sector": "mechanical",
        "procurement_text": "Supply of horizontal centrifugal water pump set with cast iron body, "
                            "minimum operating pressure 10 bar, performance tested.",
        "gold_standards": ["IS 1520 : 2007", "IS 210 : 2009", "IS 5120 : 1977"],
    },
    {
        "name": "pvc-water-pipe", "sector": "water",
        "procurement_text": "Supply of unplasticized PVC pipes for potable water supply with specified "
                            "pressure rating and dimensions.",
        "gold_standards": ["IS 4985 : 2000"],
    },
    {
        "name": "rcc-works", "sector": "civil",
        "procurement_text": "Reinforced cement concrete works using structural steel reinforcement and "
                            "graded aggregate as per code of practice.",
        "gold_standards": ["IS 456 : 2000", "IS 2062 : 2011", "IS 383 : 2016"],
    },
    {
        "name": "solar-street-light", "sector": "electrical",
        "procurement_text": "Supply and installation of standalone solar LED street lighting system with "
                            "crystalline silicon PV module, MPPT charge controller, and LiFePO4 battery.",
        "gold_standards": ["IS 10322 (Part 5/Sec 3) : 2013", "IS 16107 (Part 2/Sec 1) : 2014", "IS 14286 : 2010", "IS 16077 : 2013", "IS 16270 : 2014"],
    },
    {
        "name": "portable-fire-extinguisher", "sector": "safety",
        "procurement_text": "Supply of portable ABC dry powder fire extinguishers with performance testing "
                            "and ISI certification mark for building fire protection.",
        "gold_standards": ["IS 15683 : 2018", "IS 2190 : 2010"],
    },
    {
        "name": "distribution-transformer", "sector": "electrical",
        "procurement_text": "Outdoor type oil-immersed three-phase distribution transformer rated 500 kVA, "
                            "11 kV to 433 V, with specified maximum losses and temperature rise.",
        "gold_standards": ["IS 1180 (Part 1) : 2014", "IS 2026 (Part 1) : 2011"],
    },
    {
        "name": "xlpe-insulated-cables", "sector": "electrical",
        "procurement_text": "Supply of 1.1 kV grade multi-core copper conductor crosslinked polyethylene "
                            "(XLPE) insulated and PVC sheathed armoured power cable.",
        "gold_standards": ["IS 7098 (Part 1) : 1988", "IS 694 : 2010"],
    },
    {
        "name": "ductile-iron-water-pipes", "sector": "water",
        "procurement_text": "Supply of centrifugally cast ductile iron (DI) K9 pipes for drinking water "
                            "supply distribution network with push-on joints.",
        "gold_standards": ["IS 8329 : 2000", "IS 10500 : 2012"],
    },
    {
        "name": "water-works-sluice-valves", "sector": "water",
        "procurement_text": "Double flanged PN 1.6 cast iron sluice valves for water supply pipeline works "
                            "with stainless steel spindle.",
        "gold_standards": ["IS 14846 : 2000", "IS 210 : 2009"],
    },
    {
        "name": "mcb-overcurrent-protection", "sector": "electrical",
        "procurement_text": "Miniature circuit breaker (MCB) 10 kA breaking capacity, C curve, for "
                            "overcurrent and short-circuit protection.",
        "gold_standards": ["IS 8828 : 2019"],
    },
    {
        "name": "high-strength-rebar", "sector": "materials",
        "procurement_text": "Supply of Fe 500D high strength deformed TMT steel reinforcement bars for RCC "
                            "structures with mandatory tensile strength and elongation.",
        "gold_standards": ["IS 1786 : 2008", "IS 2062 : 2011"],
    },
    {
        "name": "electrical-earthing-system", "sector": "electrical",
        "procurement_text": "Design and execution of electrical substation earthing grid and copper bonded "
                            "earth electrodes with soil resistivity testing.",
        "gold_standards": ["IS 3043 : 2018", "IS 732 : 2019"],
    },
    {
        "name": "paving-bitumen-highway", "sector": "civil",
        "procurement_text": "Supply of VG-30 viscosity grade paving bitumen for national highway flexible "
                            "pavement road surfacing works.",
        "gold_standards": ["IS 73 : 2013"],
    },
]
