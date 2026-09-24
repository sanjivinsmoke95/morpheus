"""Public IS standards METADATA (mission Phase 9).

These are real, widely-known Indian Standard NUMBERS and TITLES — public metadata
published by BIS. MORPHEUS stores only number / title / sector / product-category /
a short FUNCTIONAL scope summary written by us (NOT copied from the copyrighted
standard text). Records are stamped `data_origin = PUBLIC_METADATA` to distinguish
them from DEMO_SYNTHETIC and from human-verified authoritative records.

No clause text, no test values, no copyrighted content is reproduced. Where an exact
detail is uncertain it is kept generic; regulatory status is never asserted here.
"""

PUBLIC_STANDARDS: list[dict] = [
    # ── materials / structural steel ──
    {"is_number": "IS 2062 : 2011", "title": "Hot rolled medium and high tensile structural steel",
     "sector": "materials", "product_categories": ["structural steel", "steel"], "keywords": ["steel", "structural", "e250", "tensile", "rolled"]},
    {"is_number": "IS 1786 : 2008", "title": "High strength deformed steel bars and wires for concrete reinforcement",
     "sector": "materials", "product_categories": ["rebar", "reinforcement steel"], "keywords": ["rebar", "reinforcement", "fe500", "deformed", "steel"]},
    {"is_number": "IS 808 : 2021", "title": "Hot rolled steel beam, column, channel and angle sections — dimensions",
     "sector": "materials", "product_categories": ["steel section", "beam", "channel"], "keywords": ["beam", "channel", "angle", "section", "steel"]},
    {"is_number": "IS 1239 (Part 1) : 2004", "title": "Steel tubes, tubulars and other wrought steel fittings",
     "sector": "materials", "product_categories": ["steel tube", "pipe fitting"], "keywords": ["tube", "steel", "fitting", "wrought"]},
    {"is_number": "IS 277 : 2018", "title": "Galvanized steel sheets (plain and corrugated)",
     "sector": "materials", "product_categories": ["galvanized sheet", "gi sheet"], "keywords": ["galvanized", "sheet", "zinc", "corrugated"]},
    {"is_number": "IS 3757 : 2019", "title": "High strength structural bolts",
     "sector": "materials", "product_categories": ["bolt", "fastener"], "keywords": ["bolt", "fastener", "high strength", "structural"]},
    # ── civil / cement / concrete ──
    {"is_number": "IS 456 : 2000", "title": "Plain and reinforced concrete — code of practice",
     "sector": "civil", "product_categories": ["concrete", "reinforced concrete"], "keywords": ["concrete", "rcc", "cement", "durability"]},
    {"is_number": "IS 269 : 2015", "title": "Ordinary Portland cement — specification",
     "sector": "civil", "product_categories": ["cement", "opc"], "keywords": ["cement", "opc", "portland", "grade"]},
    {"is_number": "IS 12269 : 2013", "title": "53 grade ordinary Portland cement",
     "sector": "civil", "product_categories": ["cement"], "keywords": ["cement", "53 grade", "opc"]},
    {"is_number": "IS 383 : 2016", "title": "Coarse and fine aggregate for concrete — specification",
     "sector": "civil", "product_categories": ["aggregate", "sand"], "keywords": ["aggregate", "sand", "grading", "concrete"]},
    {"is_number": "IS 800 : 2007", "title": "General construction in steel — code of practice",
     "sector": "civil", "product_categories": ["steel structure"], "keywords": ["steel", "construction", "structural", "design"]},
    {"is_number": "IS 875 (Part 3) : 2015", "title": "Design loads for buildings and structures — wind loads",
     "sector": "civil", "product_categories": ["structure"], "keywords": ["wind", "load", "design", "structure"]},
    # ── electrical ──
    {"is_number": "IS 325 : 1996", "title": "Three-phase induction motors",
     "sector": "electrical", "product_categories": ["induction motor", "motor"], "keywords": ["motor", "induction", "three phase", "voltage"]},
    {"is_number": "IS 12615 : 2018", "title": "Line operated three-phase induction motors — energy efficiency",
     "sector": "electrical", "product_categories": ["motor", "energy efficient motor"], "keywords": ["motor", "efficiency", "ie2", "ie3", "energy"]},
    {"is_number": "IS 1180 (Part 1) : 2014", "title": "Outdoor type oil-immersed distribution transformers up to 2500 kVA",
     "sector": "electrical", "product_categories": ["distribution transformer", "transformer"], "keywords": ["transformer", "distribution", "oil immersed", "kva", "outdoor"]},
    {"is_number": "IS 2026 (Part 1) : 2011", "title": "Power transformers — general",
     "sector": "electrical", "product_categories": ["power transformer", "transformer"], "keywords": ["transformer", "power", "winding", "losses"]},
    {"is_number": "IS 3043 : 2018", "title": "Code of practice for earthing",
     "sector": "electrical", "product_categories": ["earthing", "grounding"], "keywords": ["earthing", "grounding", "electrode", "resistance"]},
    {"is_number": "IS 732 : 2019", "title": "Code of practice for electrical wiring installations",
     "sector": "electrical", "product_categories": ["wiring", "installation"], "keywords": ["wiring", "installation", "cable", "circuit"]},
    {"is_number": "IS 694 : 2010", "title": "PVC insulated unsheathed and sheathed cables/cords up to 1100 V",
     "sector": "electrical", "product_categories": ["cable", "wiring cable"], "keywords": ["cable", "pvc", "copper", "1100v"]},
    {"is_number": "IS 1554 (Part 1) : 1988", "title": "PVC insulated heavy duty electric cables up to 1100 V",
     "sector": "electrical", "product_categories": ["cable", "power cable"], "keywords": ["cable", "pvc", "heavy duty", "power"]},
    {"is_number": "IS 7098 (Part 1) : 1988", "title": "Crosslinked polyethylene (XLPE) insulated cables up to 1100 V",
     "sector": "electrical", "product_categories": ["xlpe cable", "cable"], "keywords": ["xlpe", "cable", "crosslinked", "insulation"]},
    {"is_number": "IS 8828 : 2019", "title": "Electrical accessories — circuit breakers for overcurrent (MCB)",
     "sector": "electrical", "product_categories": ["mcb", "circuit breaker"], "keywords": ["mcb", "circuit breaker", "overcurrent", "ka"]},
    {"is_number": "IS 13947 (Part 1) : 1993", "title": "Low-voltage switchgear and controlgear — general rules",
     "sector": "electrical", "product_categories": ["switchgear", "controlgear"], "keywords": ["switchgear", "controlgear", "low voltage"]},
    {"is_number": "IS 13703 (Part 1) : 1993", "title": "Low-voltage fuses",
     "sector": "electrical", "product_categories": ["fuse"], "keywords": ["fuse", "low voltage", "protection"]},
    {"is_number": "IS 3156 (Part 1) : 2013", "title": "Voltage transformers",
     "sector": "electrical", "product_categories": ["voltage transformer", "instrument transformer"], "keywords": ["voltage transformer", "instrument", "metering"]},
    {"is_number": "IS 2705 (Part 1) : 1992", "title": "Current transformers",
     "sector": "electrical", "product_categories": ["current transformer", "instrument transformer"], "keywords": ["current transformer", "instrument", "metering"]},
    {"is_number": "IS 9224 (Part 1) : 2018", "title": "Low-voltage fuses for industrial applications",
     "sector": "electrical", "product_categories": ["fuse", "hrc fuse"], "keywords": ["fuse", "hrc", "industrial", "protection"]},
    {"is_number": "IS 16107 (Part 2/Sec 1) : 2014", "title": "Luminaire performance — LED luminaires",
     "sector": "electrical", "product_categories": ["led luminaire", "luminaire"], "keywords": ["led", "luminaire", "lumen", "efficacy", "cri"]},
    {"is_number": "IS 15885 (Part 2/Sec 13) : 2012", "title": "Safety of lamps — LED lamps",
     "sector": "electrical", "product_categories": ["led lamp", "lamp"], "keywords": ["led", "lamp", "safety", "lighting"]},
    {"is_number": "IS 14286 : 2010", "title": "Crystalline silicon terrestrial PV modules — design qualification",
     "sector": "electrical", "product_categories": ["solar panel", "pv module"], "keywords": ["solar", "pv", "module", "photovoltaic", "silicon"]},
    {"is_number": "IS 16077 : 2013", "title": "Photovoltaic systems — charge controllers",
     "sector": "electrical", "product_categories": ["charge controller", "solar"], "keywords": ["solar", "charge controller", "mppt", "pv"]},
    # ── mechanical / water ──
    {"is_number": "IS 9137 : 1978", "title": "Code for acceptance tests for centrifugal, mixed and axial flow pumps",
     "sector": "mechanical", "product_categories": ["pump", "pump test"], "keywords": ["pump", "test", "acceptance", "performance"]},
    {"is_number": "IS 554 : 1999", "title": "Dimensions for pipe threads for fastening purposes",
     "sector": "mechanical", "product_categories": ["pipe thread", "fitting"], "keywords": ["thread", "pipe", "fitting", "dimension"]},
    {"is_number": "IS 4985 : 2021", "title": "Unplasticized PVC pipes for potable water supplies",
     "sector": "water", "product_categories": ["pvc pipe", "water pipe"], "keywords": ["pipe", "pvc", "water", "potable", "pressure"]},
    {"is_number": "IS 4984 : 2016", "title": "High density polyethylene (HDPE) pipes for water supply",
     "sector": "water", "product_categories": ["hdpe pipe", "water pipe"], "keywords": ["pipe", "hdpe", "water", "polyethylene"]},
    {"is_number": "IS 12701 : 1996", "title": "Rotational moulded polyethylene water storage tanks",
     "sector": "water", "product_categories": ["water tank", "storage tank"], "keywords": ["tank", "water", "storage", "polyethylene"]},
    # ── electronics / IT ──
    {"is_number": "IS 13252 (Part 1) : 2010", "title": "Information technology equipment — safety",
     "sector": "electronics", "product_categories": ["it equipment", "electronic apparatus"], "keywords": ["it", "equipment", "safety", "electronics"]},
    {"is_number": "IS 616 : 2017", "title": "Audio, video and similar electronic apparatus — safety",
     "sector": "electronics", "product_categories": ["electronic apparatus", "audio equipment"], "keywords": ["electronics", "safety", "audio", "video"]},
]
