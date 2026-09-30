"""DEMO / SYNTHETIC standards dataset.

⚠️ These records are illustrative and labelled DEMO_SYNTHETIC. They are NOT
official BIS data and must not be presented as authoritative. Numbers/titles are
realistic in structure so retrieval and the audit can be demonstrated; an admin
replaces them with authoritative/curated records (see security.md §data-use).
Every record here is stamped data_origin=DEMO_SYNTHETIC and source_name="DEMO".
"""

DEMO_STANDARDS: list[dict] = [
    # ---- mechanical / water ----
    {
        "is_number": "IS 1520 : 2007", "title": "Horizontal centrifugal pumps for clear, cold, fresh water",
        "sector": "mechanical", "product_categories": ["pump", "centrifugal pump", "water pump"],
        "materials": ["cast iron", "bronze"], "status": "ACTIVE", "current_version": "2007",
        "publication_year": 1980, "revision_year": 2007,
        "scope": "Requirements for horizontal centrifugal pumps handling clear cold fresh water, including "
                 "operating pressure, head, discharge, efficiency and construction materials.",
        "keywords": ["pump", "centrifugal", "pressure", "head", "discharge", "water"],
    },
    {
        "is_number": "IS 5120 : 1977", "title": "Technical requirements for rotodynamic special purpose pumps",
        "sector": "mechanical", "product_categories": ["pump", "rotodynamic pump"], "materials": [],
        "status": "ACTIVE", "current_version": "1977", "scope": "Technical and testing requirements for "
        "rotodynamic pumps including performance testing and acceptance tests.",
        "keywords": ["pump", "test", "performance", "acceptance", "rotodynamic"],
    },
    {
        "is_number": "IS 3624 : 1987", "title": "Pressure and vacuum gauges",
        "sector": "mechanical", "product_categories": ["pressure gauge", "gauge"], "materials": [],
        "status": "ACTIVE", "current_version": "1987", "scope": "Requirements and tests for bourdon tube "
        "pressure and vacuum gauges, including accuracy classes and pressure ranges.",
        "keywords": ["pressure", "gauge", "vacuum", "test", "accuracy"],
    },
    # ---- materials ----
    {
        "is_number": "IS 210 : 2009", "title": "Grey iron castings",
        "sector": "materials", "product_categories": ["casting", "grey iron casting"],
        "materials": ["cast iron", "grey iron"], "status": "ACTIVE", "current_version": "2009",
        "scope": "Grades and requirements for grey iron castings including tensile strength and chemical "
        "composition, used in pump bodies, valves and machinery parts.",
        "keywords": ["cast iron", "grey iron", "casting", "tensile", "material"],
    },
    {
        "is_number": "IS 2062 : 2011", "title": "Hot rolled medium and high tensile structural steel",
        "sector": "materials", "product_categories": ["steel", "structural steel"],
        "materials": ["steel"], "status": "ACTIVE", "current_version": "2011",
        "scope": "Requirements for hot rolled structural steel plates, sections and flats including "
        "mechanical properties and chemical composition.",
        "keywords": ["steel", "structural", "tensile", "material", "rolled"],
    },
    # ---- electrical ----
    {
        "is_number": "IS 325 : 1996", "title": "Three-phase induction motors",
        "sector": "electrical", "product_categories": ["motor", "induction motor"], "materials": [],
        "status": "ACTIVE", "current_version": "1996", "scope": "Requirements for three-phase induction "
        "motors including rated voltage, frequency, output, and temperature rise.",
        "keywords": ["motor", "induction", "voltage", "frequency", "three phase", "temperature"],
    },
    {
        "is_number": "IS 12615 : 2018", "title": "Line operated three-phase induction motors — energy efficiency",
        "sector": "electrical", "product_categories": ["motor", "induction motor", "energy efficient motor"],
        "materials": [], "status": "ACTIVE", "current_version": "2018", "scope": "Energy efficiency classes "
        "and test methods for line operated three-phase induction motors.",
        "keywords": ["motor", "efficiency", "energy", "voltage", "test"],
    },
    {
        "is_number": "IS 13947 : 1993", "title": "Low-voltage switchgear and controlgear",
        "sector": "electrical", "product_categories": ["switchgear", "controlgear"], "materials": [],
        "status": "ACTIVE", "current_version": "1993", "scope": "Safety and performance requirements for "
        "low-voltage switchgear and controlgear including insulation, protection and short-circuit tests.",
        "keywords": ["switchgear", "voltage", "safety", "insulation", "protection", "short circuit"],
    },
    # ---- water / construction / civil ----
    {
        "is_number": "IS 4985 : 2000", "title": "Unplasticized PVC pipes for potable water supplies",
        "sector": "water", "product_categories": ["pipe", "pvc pipe", "water pipe"],
        "materials": ["pvc"], "status": "ACTIVE", "current_version": "2000", "scope": "Requirements for "
        "unplasticized PVC pipes for potable water supply including pressure ratings and dimensions.",
        "keywords": ["pipe", "pvc", "water", "pressure", "dimension", "potable"],
    },
    {
        "is_number": "IS 456 : 2000", "title": "Plain and reinforced concrete — code of practice",
        "sector": "civil", "product_categories": ["concrete", "reinforced concrete"],
        "materials": ["concrete", "cement", "steel"], "status": "ACTIVE", "current_version": "2000",
        "scope": "Code of practice for plain and reinforced concrete including material, mix, strength and "
        "durability requirements.",
        "keywords": ["concrete", "cement", "reinforced", "strength", "civil", "durability"],
    },
    {
        "is_number": "IS 383 : 2016", "title": "Coarse and fine aggregate for concrete",
        "sector": "construction", "product_categories": ["aggregate"], "materials": ["aggregate", "sand"],
        "status": "ACTIVE", "current_version": "2016", "scope": "Specification for coarse and fine "
        "aggregates from natural sources for concrete, including grading and quality tests.",
        "keywords": ["aggregate", "concrete", "sand", "grading", "construction"],
    },
    # ---- food / electronics ----
    {
        "is_number": "IS 1070 : 1992", "title": "Reagent grade water",
        "sector": "food", "product_categories": ["water", "reagent water"], "materials": [],
        "status": "ACTIVE", "current_version": "1992", "scope": "Requirements for reagent grade water "
        "including conductivity and purity, used in laboratory and food testing.",
        "keywords": ["water", "reagent", "purity", "conductivity", "food", "laboratory"],
    },
    {
        "is_number": "IS 616 : 2017", "title": "Audio, video and similar electronic apparatus — safety",
        "sector": "electronics", "product_categories": ["electronic apparatus", "audio equipment"],
        "materials": [], "status": "ACTIVE", "current_version": "2017", "scope": "Safety requirements for "
        "mains-operated audio, video and similar electronic apparatus, including electric shock protection.",
        "keywords": ["electronics", "safety", "audio", "shock", "protection", "mains"],
    },
    {
        "is_number": "IS 302 : 2008", "title": "Safety of household and similar electrical appliances",
        "sector": "electronics", "product_categories": ["appliance", "electrical appliance"],
        "materials": [], "status": "ACTIVE", "current_version": "2008", "scope": "General safety "
        "requirements for household and similar electrical appliances including insulation and earthing.",
        "keywords": ["appliance", "safety", "insulation", "earthing", "electrical", "household"],
    },
    # ---- LED / lighting (solar street-light cluster) ----
    {
        "is_number": "IS 10322 (Part 5/Sec 3) : 2013",
        "title": "Luminaires — Particular requirements for street lighting luminaires",
        "sector": "electrical", "product_categories": ["luminaire", "street light", "led luminaire", "lighting"],
        "materials": ["aluminium"], "status": "ACTIVE", "current_version": "2013",
        "scope": "Safety and performance requirements for fixed street-lighting luminaires including "
        "ingress protection (IP rating), luminous efficacy, electrical safety and photobiological safety.",
        "keywords": ["luminaire", "street light", "led", "ip65", "efficacy", "lumen", "cct", "lighting", "outdoor"],
    },
    {
        "is_number": "IS 16107 (Part 2/Sec 1) : 2014",
        "title": "Luminaire performance — Particular requirements for LED luminaires",
        "sector": "electrical", "product_categories": ["led luminaire", "led light", "luminaire"],
        "materials": [], "status": "ACTIVE", "current_version": "2014",
        "scope": "Performance requirements for LED luminaires including luminous flux, efficacy (lm/W), "
        "colour rendering index (CRI), correlated colour temperature (CCT) and lumen maintenance.",
        "keywords": ["led", "luminaire", "efficacy", "lm/w", "cri", "cct", "lumen", "performance", "lighting"],
    },
    {
        "is_number": "IS 16106 : 2012",
        "title": "LED modules for general lighting — Safety requirements",
        "sector": "electrical", "product_categories": ["led module", "led"],
        "materials": [], "status": "ACTIVE", "current_version": "2012",
        "scope": "Safety specification for LED modules used in general lighting, including electrical "
        "and thermal safety and marking.",
        "keywords": ["led", "module", "safety", "lighting", "thermal", "electrical"],
    },
    {
        "is_number": "IS 15885 (Part 2/Sec 13) : 2012",
        "title": "Safety of lamps — Particular requirements for LED lamps",
        "sector": "electrical", "product_categories": ["led lamp", "lamp", "led"],
        "materials": [], "status": "ACTIVE", "current_version": "2012",
        "scope": "Safety requirements for self-ballasted LED lamps for general lighting services over "
        "50 V, including protection against electric shock.",
        "keywords": ["led", "lamp", "safety", "lighting", "shock", "self-ballasted"],
    },
    # ---- solar / energy ----
    {
        "is_number": "IS 16077 : 2013",
        "title": "Photovoltaic (PV) systems — Charge controllers",
        "sector": "electrical", "product_categories": ["charge controller", "solar", "mppt", "pv"],
        "materials": [], "status": "ACTIVE", "current_version": "2013",
        "scope": "Requirements for solar photovoltaic charge controllers including MPPT operation, "
        "over-charge and deep-discharge protection, and ingress protection.",
        "keywords": ["solar", "charge controller", "mppt", "pv", "battery", "protection", "photovoltaic"],
    },
    {
        "is_number": "IS 14286 : 2010",
        "title": "Crystalline silicon terrestrial photovoltaic (PV) modules — Design qualification",
        "sector": "electrical", "product_categories": ["solar panel", "pv module", "solar", "photovoltaic"],
        "materials": ["silicon"], "status": "ACTIVE", "current_version": "2010",
        "scope": "Design qualification and type approval for crystalline silicon terrestrial PV modules, "
        "including power output, degradation and environmental testing.",
        "keywords": ["solar", "panel", "pv", "module", "photovoltaic", "silicon", "watt", "degradation"],
    },
    {
        "is_number": "IS 16270 : 2014",
        "title": "Secondary lithium cells and batteries for solar photovoltaic application",
        "sector": "electrical", "product_categories": ["battery", "lithium battery", "solar battery", "lifepo4"],
        "materials": ["lithium"], "status": "ACTIVE", "current_version": "2014",
        "scope": "Requirements and safety tests for secondary lithium cells and batteries used in solar "
        "photovoltaic applications, including cycle life, depth of discharge and safety.",
        "keywords": ["battery", "lithium", "solar", "cycle life", "depth of discharge", "lifepo4", "backup"],
    },
    # ---- poles / structural / installation ----
    {
        "is_number": "IS 2713 (Part 1) : 1980",
        "title": "Tubular steel poles for overhead power lines — Dimensions and properties",
        "sector": "materials", "product_categories": ["pole", "steel pole", "tubular pole", "lighting pole"],
        "materials": ["steel"], "status": "ACTIVE", "current_version": "1980",
        "scope": "Dimensions, wall thickness and mechanical properties of swaged and continuously tapered "
        "tubular steel poles for overhead lines and lighting.",
        "keywords": ["pole", "steel", "tubular", "galvanised", "wind load", "height", "structural"],
    },
    {
        "is_number": "IS 3043 : 2018",
        "title": "Code of practice for earthing",
        "sector": "electrical", "product_categories": ["earthing", "grounding"],
        "materials": [], "status": "ACTIVE", "current_version": "2018", "publication_year": 1987, "revision_year": 2018,
        "scope": "Code of practice for earthing of electrical installations including earth electrode "
        "resistance, earthing conductors and protection against electric shock.",
        "keywords": ["earthing", "grounding", "electrode", "shock", "protection", "tn-s", "installation"],
    },
    {
        "is_number": "IS 694 : 2010",
        "title": "Polyvinyl chloride insulated unsheathed and sheathed cables/cords",
        "sector": "electrical", "product_categories": ["cable", "wiring cable", "pvc cable"],
        "materials": ["copper", "pvc"], "status": "ACTIVE", "current_version": "2010",
        "scope": "Requirements for PVC insulated cables and cords for working voltages up to 1100 V, "
        "including conductor size, insulation and current rating.",
        "keywords": ["cable", "wiring", "pvc", "copper", "voltage", "conductor", "sq mm"],
    },
    {
        "is_number": "IS 8828 : 1996",
        "title": "Electrical accessories — Circuit breakers for overcurrent protection (MCB)",
        "sector": "electrical", "product_categories": ["mcb", "circuit breaker", "protection"],
        "materials": [], "status": "ACTIVE", "current_version": "1996",
        "scope": "Requirements for miniature circuit breakers for over-current protection in household and "
        "similar installations, including breaking capacity and trip characteristics.",
        "keywords": ["mcb", "circuit breaker", "overcurrent", "protection", "ka", "fault", "trip"],
    },
    {
        "is_number": "IS 12063 : 1987",
        "title": "Classification of degrees of protection provided by enclosures (IP code)",
        "sector": "electrical", "product_categories": ["enclosure", "ip rating", "ingress protection"],
        "materials": [], "status": "ACTIVE", "current_version": "1987",
        "scope": "Classification of degrees of protection (IP code) provided by enclosures for electrical "
        "equipment against ingress of solid objects, dust and water.",
        "keywords": ["ip", "ingress", "protection", "enclosure", "dust", "water", "ip65", "ip54"],
    },
]

# Typed relationships between demo standards (by is_number). DEMO_SYNTHETIC.
DEMO_RELATIONSHIPS: list[dict] = [
    ("IS 1520 : 2007", "IS 5120 : 1977", "NORMATIVE_REFERENCE", "Pump technical/testing requirements", "HIGH"),
    ("IS 1520 : 2007", "IS 210 : 2009", "MATERIAL", "Pump body cast iron per grey iron castings", "HIGH"),
    ("IS 1520 : 2007", "IS 3624 : 1987", "TESTING", "Pressure verified with pressure gauges", "MEDIUM"),
    ("IS 1520 : 2007", "IS 325 : 1996", "RELATED_TO", "Driven by a three-phase induction motor", "MEDIUM"),
    ("IS 325 : 1996", "IS 12615 : 2018", "RELATED_TO", "Energy-efficiency classes for the motor", "MEDIUM"),
    ("IS 456 : 2000", "IS 2062 : 2011", "MATERIAL", "Reinforcement steel", "HIGH"),
    ("IS 456 : 2000", "IS 383 : 2016", "MATERIAL", "Aggregates for concrete", "HIGH"),
    ("IS 4985 : 2000", "IS 1520 : 2007", "RELATED_TO", "Water supply system components", "LOW"),
    # solar street-light cluster
    ("IS 10322 (Part 5/Sec 3) : 2013", "IS 16107 (Part 2/Sec 1) : 2014", "NORMATIVE_REFERENCE",
     "Street luminaire performance per LED luminaire performance standard", "HIGH"),
    ("IS 10322 (Part 5/Sec 3) : 2013", "IS 16106 : 2012", "SAFETY", "LED module safety", "HIGH"),
    ("IS 10322 (Part 5/Sec 3) : 2013", "IS 12063 : 1987", "TESTING", "IP-rating classification", "MEDIUM"),
    ("IS 16107 (Part 2/Sec 1) : 2014", "IS 15885 (Part 2/Sec 13) : 2012", "RELATED_TO", "LED lamp safety", "MEDIUM"),
    ("IS 16077 : 2013", "IS 16270 : 2014", "RELATED_TO", "Charge controller manages the battery", "HIGH"),
    ("IS 16077 : 2013", "IS 14286 : 2010", "RELATED_TO", "Charge controller for the PV module", "HIGH"),
    ("IS 2713 (Part 1) : 1980", "IS 2062 : 2011", "MATERIAL", "Pole fabricated from structural steel", "HIGH"),
    ("IS 10322 (Part 5/Sec 3) : 2013", "IS 3043 : 2018", "INSTALLATION", "Luminaire installation earthing", "MEDIUM"),
    ("IS 10322 (Part 5/Sec 3) : 2013", "IS 694 : 2010", "MATERIAL", "Internal wiring cables", "MEDIUM"),
    ("IS 10322 (Part 5/Sec 3) : 2013", "IS 8828 : 1996", "SAFETY", "Circuit protection", "MEDIUM"),
    # ---- transformers & electrical distribution ----
    ("IS 1180 (Part 1) : 2014", "IS 335 : 2018", "MATERIAL", "New insulating oils for transformers and switchgear", "HIGH"),
    ("IS 1180 (Part 1) : 2014", "IS 2026 (Part 1) : 2011", "NORMATIVE_REFERENCE", "Power transformer core testing and specifications", "HIGH"),
    ("IS 1180 (Part 1) : 2014", "IS 3043 : 2018", "INSTALLATION", "Substation earthing practice", "HIGH"),
    ("IS 1180 (Part 1) : 2014", "IS 2062 : 2011", "MATERIAL", "Transformer tank structural steel plate", "MEDIUM"),
    ("IS 2026 (Part 1) : 2011", "IS 335 : 2018", "MATERIAL", "Transformer insulating oil standard", "HIGH"),
    ("IS 7098 (Part 1) : 1988", "IS 8130 : 2013", "MATERIAL", "Conductors for insulated electric cables", "HIGH"),
    ("IS 7098 (Part 1) : 1988", "IS 5831 : 1984", "MATERIAL", "PVC insulation and sheath of electric cables", "HIGH"),
    ("IS 694 : 2010", "IS 8130 : 2013", "MATERIAL", "Conductors for PVC insulated cables", "HIGH"),
    ("IS 732 : 2019", "IS 3043 : 2018", "INSTALLATION", "Earthing requirements for electrical wiring installations", "HIGH"),
    ("IS 732 : 2019", "IS 694 : 2010", "NORMATIVE_REFERENCE", "Wiring cable selection and rating", "HIGH"),
    ("IS 732 : 2019", "IS 8828 : 1996", "SAFETY", "Overcurrent protection by MCBs in wiring installations", "HIGH"),
    ("IS 13947 (Part 2) : 1993", "IS 8828 : 1996", "RELATED_TO", "Low voltage switchgear and circuit breakers", "MEDIUM"),
    # ---- civil, concrete & structural ----
    ("IS 456 : 2000", "IS 1786 : 2008", "MATERIAL", "High strength deformed steel bars for concrete reinforcement", "HIGH"),
    ("IS 456 : 2000", "IS 269 : 2015", "MATERIAL", "Ordinary Portland cement for concrete", "HIGH"),
    ("IS 456 : 2000", "IS 12269 : 2013", "MATERIAL", "53 Grade OPC for high strength structural concrete", "HIGH"),
    ("IS 456 : 2000", "IS 10262 : 2019", "NORMATIVE_REFERENCE", "Concrete mix proportioning guidelines", "HIGH"),
    ("IS 456 : 2000", "IS 516 : 2021", "TESTING", "Compressive strength test of concrete cubes", "HIGH"),
    ("IS 456 : 2000", "IS 1199 : 2018", "TESTING", "Sampling and analysis of fresh concrete", "HIGH"),
    ("IS 800 : 2007", "IS 2062 : 2011", "MATERIAL", "Structural steel sections for steel construction", "HIGH"),
    ("IS 800 : 2007", "IS 3757 : 2019", "MATERIAL", "High strength structural bolts for steel joints", "HIGH"),
    ("IS 800 : 2007", "IS 875 (Part 3) : 2015", "NORMATIVE_REFERENCE", "Design wind loads for steel structures", "HIGH"),
    ("IS 808 : 2021", "IS 2062 : 2011", "MATERIAL", "Steel beam and channel dimensions per structural steel grade", "HIGH"),
    ("IS 383 : 2016", "IS 2386 (Part 1) : 1963", "TESTING", "Particle size and shape analysis of aggregates", "HIGH"),
    ("IS 73 : 2013", "IS 1203 : 1978", "TESTING", "Penetration testing of paving bitumen", "HIGH"),
    # ---- water supply, pipes & fittings ----
    ("IS 8329 : 2000", "IS 9523 : 2000", "NORMATIVE_REFERENCE", "Ductile iron fittings for DI pressure pipes", "HIGH"),
    ("IS 8329 : 2000", "IS 5382 : 2018", "MATERIAL", "Rubber sealing rings for water and drainage pipe joints", "HIGH"),
    ("IS 4984 : 2016", "IS 7634 (Part 2) : 2012", "INSTALLATION", "Laying and jointing of polyethylene (HDPE) water supply pipes", "HIGH"),
    ("IS 4985 : 2021", "IS 7634 (Part 3) : 2003", "INSTALLATION", "Laying and jointing of unplasticized PVC pipes", "HIGH"),
    ("IS 4985 : 2021", "IS 4984 : 2016", "RELATED_TO", "Alternative polymer piping for water distribution", "LOW"),
    ("IS 14846 : 2000", "IS 8329 : 2000", "RELATED_TO", "Sluice valve flow control in ductile iron water pipelines", "HIGH"),
    ("IS 10500 : 2012", "IS 4985 : 2021", "SAFETY", "Potable water quality safety conveyed by uPVC pipes", "MEDIUM"),
    ("IS 779 : 1994", "IS 10500 : 2012", "SAFETY", "Domestic water metering for potable water supplies", "MEDIUM"),
    # ---- solar & renewable energy ----
    ("IS 14286 : 2010", "IS/IEC 61730 (Part 1) : 2004", "SAFETY", "Photovoltaic module safety qualification and construction", "HIGH"),
    ("IS 14286 : 2010", "IS/IEC 61730 (Part 2) : 2004", "TESTING", "Photovoltaic module safety testing", "HIGH"),
    ("IS 16270 : 2014", "IS 16046 (Part 2) : 2018", "SAFETY", "Secondary lithium battery safety requirements", "HIGH"),
    ("IS 16077 : 2013", "IS 3043 : 2018", "INSTALLATION", "Earthing of solar charge controller and PV frames", "HIGH"),
    ("IS 14286 : 2010", "IS 3043 : 2018", "INSTALLATION", "Earthing of solar PV module mounting structure", "HIGH"),
    # ---- fire safety & personal protective equipment ----
    ("IS 15683 : 2018", "IS 2190 : 2010", "NORMATIVE_REFERENCE", "Code of practice for selection and installation of fire extinguishers", "HIGH"),
    ("IS 3844 : 1989", "IS 15683 : 2018", "RELATED_TO", "Complementary fire safety equipment (hydrants and extinguishers)", "MEDIUM"),
    ("IS 2925 : 1984", "IS 15298 (Part 2) : 2016", "SAFETY", "Complete personal protective equipment (safety helmets and safety footwear)", "HIGH"),
    ("IS 15298 (Part 2) : 2016", "IS 3521 : 1999", "SAFETY", "Occupational safety equipment ensemble", "MEDIUM"),
]

# Version history (by is_number). Marks current vs superseded versions.
DEMO_VERSIONS: list[dict] = [
    {"is_number": "IS 1520 : 2007", "versions": [
        {"version_label": "1980", "is_current": False, "notes": "Superseded by the 2007 revision."},
        {"version_label": "2007", "is_current": True, "notes": "Current revision."}]},
    {"is_number": "IS 325 : 1996", "versions": [{"version_label": "1996", "is_current": True, "notes": ""}]},
    {"is_number": "IS 456 : 2000", "versions": [
        {"version_label": "1978", "is_current": False, "notes": "Third revision."},
        {"version_label": "2000", "is_current": True, "notes": "Fourth revision."}]},
    {"is_number": "IS 5120 : 1977", "versions": [{"version_label": "1977", "is_current": True, "notes": ""}]},
    {"is_number": "IS 1180 (Part 1) : 2014", "versions": [
        {"version_label": "1989", "is_current": False, "notes": "Superseded by 2014 standard revision."},
        {"version_label": "2014", "is_current": True, "notes": "Current mandatory standard."}]},
    {"is_number": "IS 4985 : 2021", "versions": [
        {"version_label": "2000", "is_current": False, "notes": "Superseded by 2021 revision."},
        {"version_label": "2021", "is_current": True, "notes": "Current revision."}]},
    {"is_number": "IS 3043 : 2018", "versions": [
        {"version_label": "1987", "is_current": False, "notes": "Superseded by 2018 revision."},
        {"version_label": "2018", "is_current": True, "notes": "Current revision with modern earthing practices."}]},
    {"is_number": "IS 335 : 2018", "versions": [
        {"version_label": "1993", "is_current": False, "notes": "Superseded by 2018 revision."},
        {"version_label": "2018", "is_current": True, "notes": "Harmonized with IEC 60296."}]},
    {"is_number": "IS 269 : 2015", "versions": [
        {"version_label": "1989", "is_current": False, "notes": "Superseded when IS 269 merged 33, 43 and 53 grades."},
        {"version_label": "2015", "is_current": True, "notes": "Comprehensive Ordinary Portland Cement specification."}]},
    {"is_number": "IS 383 : 2016", "versions": [
        {"version_label": "1970", "is_current": False, "notes": "Second revision superseded."},
        {"version_label": "2016", "is_current": True, "notes": "Includes manufactured and recycled aggregates."}]},
]

# QCO records (by is_number). Aligned with authentic statutory Gazette Orders.
DEMO_QCO: list[dict] = [
    {"is_number": "IS 302 : 2008", "qco_status": "MANDATORY", "product_description": "Household electrical appliances",
     "order_name": "Electrical Appliances (Quality Control) Order, 2023", "effective_date": "2023-09-01",
     "notes": "Mandatory BIS certification mark under DPIIT Gazette notification."},
    {"is_number": "IS 616 : 2017", "qco_status": "MANDATORY", "product_description": "Audio, video and similar electronic apparatus",
     "order_name": "Electronics and Information Technology Goods (Requirement for Compulsory Registration) Order, 2021", "effective_date": "2021-04-01",
     "notes": "Mandatory registration under MeitY Compulsory Registration Scheme (CRS)."},
    {"is_number": "IS 1520 : 2007", "qco_status": "VOLUNTARY", "product_description": "Centrifugal water pumps",
     "order_name": "", "effective_date": None, "notes": "ISI marking voluntary under Scheme-I of BIS."},
    {"is_number": "IS 456 : 2000", "qco_status": "UNKNOWN", "product_description": "Plain and reinforced concrete works",
     "order_name": "", "effective_date": None, "notes": "Design and construction code of practice — verified via project specifications."},
    {"is_number": "IS 16107 (Part 2/Sec 1) : 2014", "qco_status": "MANDATORY",
     "product_description": "LED luminaires for road and street lighting",
     "order_name": "Electronics and Information Technology Goods (Requirement for Compulsory Registration) Order, 2021",
     "effective_date": "2021-04-01", "notes": "Mandatory registration under MeitY CRS schedule (Item No. 49)."},
    {"is_number": "IS 15885 (Part 2/Sec 13) : 2012", "qco_status": "MANDATORY",
     "product_description": "Self-ballasted LED lamps and LED controlgear",
     "order_name": "Electronics and Information Technology Goods (Requirement for Compulsory Registration) Order, 2021", "effective_date": "2019-10-01",
     "notes": "Mandatory registration under MeitY Compulsory Registration Scheme (CRS)."},
    {"is_number": "IS 14286 : 2010", "qco_status": "MANDATORY",
     "product_description": "Crystalline silicon terrestrial photovoltaic (PV) modules",
     "order_name": "Solar Photovoltaics, Systems, Devices and Components Goods (Requirements for Compulsory Registration) Order, 2017", "effective_date": "2018-04-16",
     "notes": "Mandatory registration under MNRE Gazette Notification S.O. 2920(E)."},
    {"is_number": "IS 2062 : 2011", "qco_status": "MANDATORY",
     "product_description": "Hot rolled medium and high tensile structural steel",
     "order_name": "Steel and Steel Products (Quality Control) Order, 2024", "effective_date": "2024-03-01",
     "notes": "Mandatory BIS Standard Mark (ISI) under Ministry of Steel Gazette S.O. 714(E)."},
    {"is_number": "IS 1786 : 2008", "qco_status": "MANDATORY",
     "product_description": "High strength deformed steel bars and wires for concrete reinforcement (TMT rebar)",
     "order_name": "Steel and Steel Products (Quality Control) Order, 2024", "effective_date": "2024-03-01",
     "notes": "Mandatory BIS Standard Mark (ISI) under Ministry of Steel Gazette Order."},
    {"is_number": "IS 4985 : 2000", "qco_status": "MANDATORY",
     "product_description": "Unplasticized PVC pipes for potable water supplies",
     "order_name": "Pipes and Fittings (Quality Control) Order, 2023", "effective_date": "2023-10-23",
     "notes": "Mandatory BIS Standard Mark (ISI) under DPIIT Gazette Order."},
    {"is_number": "IS 4985 : 2021", "qco_status": "MANDATORY",
     "product_description": "Unplasticized PVC pipes for potable water supplies",
     "order_name": "Pipes and Fittings (Quality Control) Order, 2023", "effective_date": "2023-10-23",
     "notes": "Mandatory BIS Standard Mark (ISI) under DPIIT Gazette Order S.O. 4607(E)."},
    {"is_number": "IS 4984 : 2016", "qco_status": "MANDATORY",
     "product_description": "High density polyethylene (HDPE) pipes for water supply",
     "order_name": "Pipes and Fittings (Quality Control) Order, 2023", "effective_date": "2023-10-23",
     "notes": "Mandatory BIS Standard Mark (ISI) under DPIIT Gazette Order."},
    {"is_number": "IS 8329 : 2000", "qco_status": "MANDATORY",
     "product_description": "Centrifugally cast (ductile) iron pipes for water, gas and sewage",
     "order_name": "Ductile Iron Pipes and Fittings (Quality Control) Order, 2023", "effective_date": "2023-12-01",
     "notes": "Mandatory BIS Standard Mark (ISI) under Ministry of Steel Gazette Order."},
    {"is_number": "IS 1180 (Part 1) : 2014", "qco_status": "MANDATORY",
     "product_description": "Outdoor type oil-immersed distribution transformers up to 2500 kVA",
     "order_name": "Distribution Transformers (Quality Control) Order, 2014", "effective_date": "2014-08-01",
     "notes": "Mandatory BIS Standard Mark (ISI) under DPIIT Gazette Order S.O. 126(E)."},
    {"is_number": "IS 694 : 2010", "qco_status": "MANDATORY",
     "product_description": "PVC insulated unsheathed and sheathed cables up to 1100 V",
     "order_name": "Electrical Wires and Cables (Quality Control) Order, 2023", "effective_date": "2024-01-01",
     "notes": "Mandatory BIS Standard Mark (ISI) under DPIIT Gazette Order."},
    {"is_number": "IS 7098 (Part 1) : 1988", "qco_status": "MANDATORY",
     "product_description": "Cross-linked polyethylene insulated PVC sheathed cables (XLPE)",
     "order_name": "Electrical Wires and Cables (Quality Control) Order, 2023", "effective_date": "2024-01-01",
     "notes": "Mandatory BIS Standard Mark (ISI) under DPIIT Gazette Order."},
    {"is_number": "IS 269 : 2015", "qco_status": "MANDATORY",
     "product_description": "Ordinary Portland cement (33, 43 and 53 grades)",
     "order_name": "Cement (Quality Control) Order, 2024", "effective_date": "2024-04-01",
     "notes": "Mandatory BIS Standard Mark (ISI) under DPIIT Gazette Order."},
    {"is_number": "IS 12269 : 2013", "qco_status": "MANDATORY",
     "product_description": "53 grade ordinary Portland cement",
     "order_name": "Cement (Quality Control) Order, 2024", "effective_date": "2024-04-01",
     "notes": "Mandatory BIS Standard Mark (ISI) under DPIIT Gazette Order."},
    {"is_number": "IS 15683 : 2018", "qco_status": "MANDATORY",
     "product_description": "Portable fire extinguishers",
     "order_name": "Fire Fighting Equipment (Quality Control) Order, 2024", "effective_date": "2024-06-01",
     "notes": "Mandatory BIS Standard Mark (ISI) under DPIIT Gazette Order."},
    {"is_number": "IS 2925 : 1984", "qco_status": "MANDATORY",
     "product_description": "Industrial safety helmets",
     "order_name": "Personal Protective Equipment (Quality Control) Order, 2023", "effective_date": "2023-12-06",
     "notes": "Mandatory BIS Standard Mark (ISI) under DPIIT Gazette Order."},
    {"is_number": "IS 15298 (Part 2) : 2016", "qco_status": "MANDATORY",
     "product_description": "Personal protective equipment — Safety footwear",
     "order_name": "Footwear made from Leather and other materials (Quality Control) Order, 2024", "effective_date": "2024-01-01",
     "notes": "Mandatory BIS Standard Mark (ISI) under DPIIT Gazette Order."},
    {"is_number": "IS 16046 (Part 2) : 2018", "qco_status": "MANDATORY",
     "product_description": "Secondary lithium cells and batteries for portable applications",
     "order_name": "Electronics and Information Technology Goods (Requirement for Compulsory Registration) Order, 2021", "effective_date": "2021-04-01",
     "notes": "Mandatory registration under MeitY Compulsory Registration Scheme (CRS)."},
    {"is_number": "IS 335 : 2018", "qco_status": "MANDATORY",
     "product_description": "New insulating oils for transformers and switchgear",
     "order_name": "Insulating Oil (Quality Control) Order, 2024", "effective_date": "2024-07-01",
     "notes": "Mandatory BIS Standard Mark (ISI) under DPIIT Gazette Order."},
]

# Certification records (by is_number). DEMO.
DEMO_CERT: list[dict] = [
    {"is_number": "IS 302 : 2008", "scheme": "CRS", "product_description": "Household appliances",
     "requirement": "BIS registration under CRS before sale.", "effective_date": "2021-01-01"},
    {"is_number": "IS 616 : 2017", "scheme": "CRS", "product_description": "Electronic apparatus",
     "requirement": "BIS registration under CRS.", "effective_date": "2020-10-01"},
    {"is_number": "IS 1520 : 2007", "scheme": "ISI", "product_description": "Water pumps",
     "requirement": "ISI marking under a BIS licence (voluntary).", "effective_date": None},
]

# Amendments (by is_number). Data only — impact analysis is Phase 5.
DEMO_AMENDMENTS: list[dict] = [
    {"is_number": "IS 456 : 2000", "amendments": [
        {"amendment_no": "Amendment No. 1", "amendment_date": "2005-06-01",
         "affected_clauses": ["8.2 Durability"], "summary": "Revised durability and cover requirements."},
        {"amendment_no": "Amendment No. 2", "amendment_date": "2010-03-01",
         "affected_clauses": ["26.4 Nominal cover"], "summary": "Updated nominal cover for exposure conditions."}]},
    {"is_number": "IS 1520 : 2007", "amendments": [
        {"amendment_no": "Amendment No. 1", "amendment_date": "2010-09-01",
         "affected_clauses": ["9 Efficiency"], "summary": "Revised minimum efficiency and test tolerance."}]},
]
