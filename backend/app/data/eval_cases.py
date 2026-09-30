"""Labelled evaluation gold set (authentic procurement specifications & benchmark cases).
Each case has procurement text, gold relevant standards, and expected applicability class."""

EVAL_CASES: list[dict] = [
    # ==================== MECHANICAL ====================
    {
        "name": "pump-set", "sector": "mechanical",
        "procurement_text": "Supply of horizontal centrifugal water pump set with cast iron body, "
                            "minimum operating pressure 10 bar, performance tested.",
        "gold_standards": ["IS 1520 : 2007", "IS 210 : 2009", "IS 5120 : 1977"],
        "gold_applicability": {
            "IS 1520 : 2007": "DIRECTLY_APPLICABLE",
            "IS 5120 : 1977": "TESTING",
            "IS 210 : 2009": "RELATED",
        },
    },
    {
        "name": "submersible-borewell-pump", "sector": "mechanical",
        "procurement_text": "Supply and installation of submersible pump sets for deep tube-wells for clear, "
                            "cold water supply with multi-stage centrifugal pump and water-cooled motor.",
        "gold_standards": ["IS 8034 : 2018", "IS 9137 : 1978"],
        "gold_applicability": {
            "IS 8034 : 2018": "DIRECTLY_APPLICABLE",
            "IS 9137 : 1978": "TESTING",
        },
    },
    {
        "name": "agricultural-monobloc-pump", "sector": "mechanical",
        "procurement_text": "Supply of agricultural monobloc pump sets for clear, cold water supply with "
                            "energy efficient three phase induction motor for rural irrigation.",
        "gold_standards": ["IS 6595 (Part 1) : 2002", "IS 325 : 1996"],
        "gold_applicability": {
            "IS 6595 (Part 1) : 2002": "DIRECTLY_APPLICABLE",
            "IS 325 : 1996": "RELATED",
        },
    },
    {
        "name": "three-phase-induction-motor", "sector": "electrical",
        "procurement_text": "Supply of 3-phase squirrel cage induction motor rated 15 kW, 415 V, 50 Hz, "
                            "IE3 premium efficiency, foot-mounted with IP55 protection.",
        "gold_standards": ["IS 12615 : 2018", "IS 325 : 1996", "IS 12063 : 1987"],
        "gold_applicability": {
            "IS 12615 : 2018": "DIRECTLY_APPLICABLE",
            "IS 325 : 1996": "CONDITIONAL",
            "IS 12063 : 1987": "TESTING",
        },
    },
    {
        "name": "industrial-pressure-gauges", "sector": "mechanical",
        "procurement_text": "Supply of dial type industrial Bourdon tube pressure gauges with range 0 to 25 bar, "
                            "accuracy class 1.0, SS 316 wetted parts and 1/2 inch BSP connection.",
        "gold_standards": ["IS 3624 : 1987", "IS 554 : 1999"],
        "gold_applicability": {
            "IS 3624 : 1987": "DIRECTLY_APPLICABLE",
            "IS 554 : 1999": "RELATED",
        },
    },

    # ==================== ELECTRICAL & DISTRIBUTION ====================
    {
        "name": "distribution-transformer", "sector": "electrical",
        "procurement_text": "Outdoor type oil-immersed three-phase distribution transformer rated 500 kVA, "
                            "11 kV to 433 V, with specified maximum losses, BIS Level-2 star rating.",
        "gold_standards": ["IS 1180 (Part 1) : 2014", "IS 335 : 2018", "IS 2026 (Part 1) : 2011"],
        "gold_applicability": {
            "IS 1180 (Part 1) : 2014": "DIRECTLY_APPLICABLE",
            "IS 335 : 2018": "RELATED",
            "IS 2026 (Part 1) : 2011": "TESTING",
        },
    },
    {
        "name": "transformer-insulating-oil", "sector": "electrical",
        "procurement_text": "Supply of uninhibited new mineral insulating oils for electrical transformers, "
                            "chokes and switchgear with breakdown voltage >= 60 kV.",
        "gold_standards": ["IS 335 : 2018"],
        "gold_applicability": {
            "IS 335 : 2018": "DIRECTLY_APPLICABLE",
        },
    },
    {
        "name": "xlpe-insulated-cables", "sector": "electrical",
        "procurement_text": "Supply of 1.1 kV grade multi-core copper conductor crosslinked polyethylene "
                            "(XLPE) insulated and PVC sheathed armoured power cable.",
        "gold_standards": ["IS 7098 (Part 1) : 1988", "IS 5831 : 1984"],
        "gold_applicability": {
            "IS 7098 (Part 1) : 1988": "DIRECTLY_APPLICABLE",
            "IS 5831 : 1984": "RELATED",
        },
    },
    {
        "name": "pvc-insulated-cables", "sector": "electrical",
        "procurement_text": "Supply of single core PVC insulated unsheathed copper cables for working "
                            "voltages up to and including 1100 V for conduit wiring.",
        "gold_standards": ["IS 694 : 2010"],
        "gold_applicability": {
            "IS 694 : 2010": "DIRECTLY_APPLICABLE",
        },
    },
    {
        "name": "mcb-overcurrent-protection", "sector": "electrical",
        "procurement_text": "Miniature circuit breaker (MCB) 10 kA breaking capacity, C curve, for "
                            "overcurrent and short-circuit protection in residential and commercial installations.",
        "gold_standards": ["IS 8828 : 1996"],
        "gold_applicability": {
            "IS 8828 : 1996": "DIRECTLY_APPLICABLE",
        },
    },
    {
        "name": "rcbo-residual-current-breaker", "sector": "electrical",
        "procurement_text": "Residual current operated circuit breakers with integral overcurrent protection (RCBO) "
                            "for household and similar uses, 30 mA sensitivity.",
        "gold_standards": ["IS 12640 (Part 2) : 2016", "IS 8828 : 1996"],
        "gold_applicability": {
            "IS 12640 (Part 2) : 2016": "DIRECTLY_APPLICABLE",
            "IS 8828 : 1996": "RELATED",
        },
    },
    {
        "name": "electrical-earthing-system", "sector": "electrical",
        "procurement_text": "Design and execution of electrical substation earthing grid and copper bonded "
                            "earth electrodes with soil resistivity testing and code of practice.",
        "gold_standards": ["IS 3043 : 2018", "IS 732 : 2019"],
        "gold_applicability": {
            "IS 3043 : 2018": "DIRECTLY_APPLICABLE",
            "IS 732 : 2019": "RELATED",
        },
    },
    {
        "name": "ac-static-energy-meters", "sector": "electrical",
        "procurement_text": "Supply of AC static transformer-operated and direct-connected watt-hour and VAR-hour "
                            "energy meters class 1.0 and 2.0 with DLMS communication.",
        "gold_standards": ["IS 13779 : 1999"],
        "gold_applicability": {
            "IS 13779 : 1999": "DIRECTLY_APPLICABLE",
        },
    },
    {
        "name": "electrical-wiring-installation", "sector": "electrical",
        "procurement_text": "Code of practice for electrical wiring installations in non-industrial buildings "
                            "including points, conduit routing, earth continuity and testing.",
        "gold_standards": ["IS 732 : 2019", "IS 3043 : 2018", "IS 694 : 2010"],
        "gold_applicability": {
            "IS 732 : 2019": "DIRECTLY_APPLICABLE",
            "IS 3043 : 2018": "INSTALLATION",
            "IS 694 : 2010": "RELATED",
        },
    },

    # ==================== SOLAR & RENEWABLE ENERGY ====================
    {
        "name": "solar-street-light", "sector": "electrical",
        "procurement_text": "Supply and installation of standalone solar LED street lighting system with "
                            "crystalline silicon PV module, MPPT charge controller, and LiFePO4 battery.",
        "gold_standards": ["IS 10322 (Part 5/Sec 3) : 2013", "IS 16107 (Part 2/Sec 1) : 2014", "IS 14286 : 2010", "IS 16077 : 2013", "IS 16270 : 2014"],
        "gold_applicability": {
            "IS 10322 (Part 5/Sec 3) : 2013": "DIRECTLY_APPLICABLE",
            "IS 16107 (Part 2/Sec 1) : 2014": "DIRECTLY_APPLICABLE",
            "IS 14286 : 2010": "RELATED",
            "IS 16077 : 2013": "RELATED",
            "IS 16270 : 2014": "RELATED",
        },
    },
    {
        "name": "pv-modules-crystalline", "sector": "electrical",
        "procurement_text": "Crystalline silicon terrestrial photovoltaic (PV) modules for grid-connected utility "
                            "solar power plant with design qualification and type approval.",
        "gold_standards": ["IS 14286 : 2010", "IS/IEC 61730 (Part 1) : 2016"],
        "gold_applicability": {
            "IS 14286 : 2010": "DIRECTLY_APPLICABLE",
            "IS/IEC 61730 (Part 1) : 2016": "TESTING",
        },
    },
    {
        "name": "solar-mppt-charge-controller", "sector": "electrical",
        "procurement_text": "Photovoltaic (PV) system charge controllers with maximum power point tracking (MPPT), "
                            "efficiency > 95% and deep discharge protection.",
        "gold_standards": ["IS 16077 : 2013"],
        "gold_applicability": {
            "IS 16077 : 2013": "DIRECTLY_APPLICABLE",
        },
    },
    {
        "name": "led-flood-luminaire", "sector": "electrical",
        "procurement_text": "Luminaires for floodlighting and public lighting with LED light source, "
                            "optical diffuser and IP66 ingress protection rating.",
        "gold_standards": ["IS 10322 (Part 5/Sec 5) : 2013", "IS 12063 : 1987"],
        "gold_applicability": {
            "IS 10322 (Part 5/Sec 5) : 2013": "DIRECTLY_APPLICABLE",
            "IS 12063 : 1987": "TESTING",
        },
    },

    # ==================== CIVIL & STRUCTURAL ====================
    {
        "name": "rcc-works", "sector": "civil",
        "procurement_text": "Reinforced cement concrete works using structural steel reinforcement and "
                            "graded aggregate as per code of practice.",
        "gold_standards": ["IS 456 : 2000", "IS 2062 : 2011", "IS 383 : 2016"],
        "gold_applicability": {
            "IS 456 : 2000": "DIRECTLY_APPLICABLE",
            "IS 2062 : 2011": "RELATED",
            "IS 383 : 2016": "RELATED",
        },
    },
    {
        "name": "opc-53-cement", "sector": "civil",
        "procurement_text": "Supply of 53 Grade Ordinary Portland Cement conforming to BIS specifications for "
                            "high-strength prestressed concrete bridge girders.",
        "gold_standards": ["IS 12269 : 2013", "IS 269 : 2015"],
        "gold_applicability": {
            "IS 12269 : 2013": "DIRECTLY_APPLICABLE",
            "IS 269 : 2015": "CONDITIONAL",
        },
    },
    {
        "name": "ppc-cement-masonry", "sector": "civil",
        "procurement_text": "Supply of Portland Pozzolana Cement (fly ash based) for general civil engineering "
                            "and building masonry construction works.",
        "gold_standards": ["IS 1489 (Part 1) : 2015"],
        "gold_applicability": {
            "IS 1489 (Part 1) : 2015": "DIRECTLY_APPLICABLE",
        },
    },
    {
        "name": "high-strength-rebar", "sector": "materials",
        "procurement_text": "Supply of Fe 500D high strength deformed TMT steel reinforcement bars for RCC "
                            "structures with mandatory tensile strength and elongation.",
        "gold_standards": ["IS 1786 : 2008", "IS 456 : 2000"],
        "gold_applicability": {
            "IS 1786 : 2008": "DIRECTLY_APPLICABLE",
            "IS 456 : 2000": "RELATED",
        },
    },
    {
        "name": "structural-steel-beams", "sector": "materials",
        "procurement_text": "Hot rolled medium and high tensile structural steel sections including I-beams, "
                            "channels and angles of Grade E250 for warehouse structural frame.",
        "gold_standards": ["IS 2062 : 2011", "IS 808 : 2021", "IS 800 : 2007"],
        "gold_applicability": {
            "IS 2062 : 2011": "DIRECTLY_APPLICABLE",
            "IS 808 : 2021": "RELATED",
            "IS 800 : 2007": "RELATED",
        },
    },
    {
        "name": "paving-bitumen-highway", "sector": "civil",
        "procurement_text": "Supply of VG-30 viscosity grade paving bitumen for national highway flexible "
                            "pavement road surfacing works.",
        "gold_standards": ["IS 73 : 2013"],
        "gold_applicability": {
            "IS 73 : 2013": "DIRECTLY_APPLICABLE",
        },
    },
    {
        "name": "concrete-mix-design", "sector": "civil",
        "procurement_text": "Standard guidelines and code of practice for concrete mix proportioning and "
                            "design of M30 grade concrete with fly ash replacement.",
        "gold_standards": ["IS 10262 : 2019", "IS 456 : 2000"],
        "gold_applicability": {
            "IS 10262 : 2019": "DIRECTLY_APPLICABLE",
            "IS 456 : 2000": "RELATED",
        },
    },
    {
        "name": "earthquake-resistant-design", "sector": "civil",
        "procurement_text": "Criteria for earthquake resistant design of structures and ductile detailing of "
                            "reinforced concrete structures subjected to seismic forces in Zone IV.",
        "gold_standards": ["IS 1893 (Part 1) : 2016", "IS 13920 : 2016"],
        "gold_applicability": {
            "IS 1893 (Part 1) : 2016": "DIRECTLY_APPLICABLE",
            "IS 13920 : 2016": "DIRECTLY_APPLICABLE",
        },
    },

    # ==================== WATER SUPPLY & PIPING ====================
    {
        "name": "pvc-water-pipe", "sector": "water",
        "procurement_text": "Supply of unplasticized PVC pipes for potable water supply with specified "
                            "pressure rating and dimensions.",
        "gold_standards": ["IS 4985 : 2021", "IS 4985 : 2000"],
        "gold_applicability": {
            "IS 4985 : 2021": "DIRECTLY_APPLICABLE",
            "IS 4985 : 2000": "CONDITIONAL",
        },
    },
    {
        "name": "hdpe-water-pipe", "sector": "water",
        "procurement_text": "Supply of high density polyethylene (HDPE) pipes PE 100 grade PN 10 for drinking "
                            "water supply under Jal Jeevan Mission.",
        "gold_standards": ["IS 4984 : 2016", "IS 10500 : 2012"],
        "gold_applicability": {
            "IS 4984 : 2016": "DIRECTLY_APPLICABLE",
            "IS 10500 : 2012": "RELATED",
        },
    },
    {
        "name": "ductile-iron-water-pipes", "sector": "water",
        "procurement_text": "Supply of centrifugally cast ductile iron (DI) K9 pipes for drinking water "
                            "supply distribution network with push-on joints.",
        "gold_standards": ["IS 8329 : 2000", "IS 9523 : 2000"],
        "gold_applicability": {
            "IS 8329 : 2000": "DIRECTLY_APPLICABLE",
            "IS 9523 : 2000": "RELATED",
        },
    },
    {
        "name": "water-works-sluice-valves", "sector": "water",
        "procurement_text": "Double flanged PN 1.6 cast iron sluice valves for water works purposes "
                            "(50 to 1200 mm size) with stainless steel spindle.",
        "gold_standards": ["IS 14846 : 2000", "IS 210 : 2009"],
        "gold_applicability": {
            "IS 14846 : 2000": "DIRECTLY_APPLICABLE",
            "IS 210 : 2009": "RELATED",
        },
    },
    {
        "name": "domestic-water-meters", "sector": "water",
        "procurement_text": "Supply of inferential and semi-positive domestic type water meters conforming to "
                            "class B for individual municipal household service connections.",
        "gold_standards": ["IS 779 : 1994", "IS 6784 : 1996"],
        "gold_applicability": {
            "IS 779 : 1994": "DIRECTLY_APPLICABLE",
            "IS 6784 : 1996": "TESTING",
        },
    },

    # ==================== SAFETY & FIRE PROTECTION ====================
    {
        "name": "portable-fire-extinguisher", "sector": "safety",
        "procurement_text": "Supply of portable ABC dry powder fire extinguishers with performance testing "
                            "and ISI certification mark for building fire protection.",
        "gold_standards": ["IS 15683 : 2018", "IS 2190 : 2010"],
        "gold_applicability": {
            "IS 15683 : 2018": "DIRECTLY_APPLICABLE",
            "IS 2190 : 2010": "RELATED",
        },
    },
    {
        "name": "internal-fire-hydrant-system", "sector": "safety",
        "procurement_text": "Installation and maintenance of internal fire hydrants, landing valves and first-aid "
                            "hose reels in commercial multistory building.",
        "gold_standards": ["IS 3844 : 1989"],
        "gold_applicability": {
            "IS 3844 : 1989": "DIRECTLY_APPLICABLE",
        },
    },

    # ==================== ADVERSARIAL, MULTILINGUAL & EDGE CASES ====================
    {
        "name": "multilingual-hindi-pump-tender", "sector": "mechanical",
        "procurement_text": "५० एचपी थ्री फेज सबमर्सिबल पंप सेट की आपूर्ति एवं संस्थापना कार्य। कास्ट आयरन बॉडी, १० बार न्यूनतम दबाव।",
        "gold_standards": ["IS 8034 : 2018", "IS 1520 : 2007", "IS 210 : 2009"],
        "gold_applicability": {
            "IS 8034 : 2018": "DIRECTLY_APPLICABLE",
            "IS 1520 : 2007": "CONDITIONAL",
            "IS 210 : 2009": "RELATED",
        },
    },
    {
        "name": "obsolete-version-reference-tender", "sector": "mechanical",
        "procurement_text": "Horizontal centrifugal water pump conforming strictly to IS 1520 : 1980 standard specifications.",
        "gold_standards": ["IS 1520 : 2007"],
        "gold_applicability": {
            "IS 1520 : 2007": "CONDITIONAL",  # superseded version cited; engine should flag condition/supersession
        },
    },
    {
        "name": "adversarial-non-existent-standard", "sector": "water",
        "procurement_text": "Supply of ultra-high molecular weight synthetic membrane valves complying with IS 99999 : 2099 specifications.",
        "gold_standards": [],  # Non-existent standard; retrieval/applicability must abstain or flag review required, 0 hallucinations
        "gold_applicability": {},
    },
]

