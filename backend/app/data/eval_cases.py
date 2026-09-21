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
        "name": "induction-motor", "sector": "electrical",
        "procurement_text": "Three-phase induction motor rated 415 V, 50 Hz, energy efficient class.",
        "gold_standards": ["IS 325 : 1996", "IS 12615 : 2018"],
    },
]
