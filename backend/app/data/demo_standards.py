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
]

# Version history (by is_number). Marks current vs superseded versions.
DEMO_VERSIONS: list[dict] = [
    {"is_number": "IS 1520 : 2007", "versions": [
        {"version_label": "1980", "is_current": False, "notes": "Superseded by the 2007 revision."},
        {"version_label": "2007", "is_current": True, "notes": "Current revision."}]},
    {"is_number": "IS 325 : 1996", "versions": [{"version_label": "1996", "is_current": True, "notes": ""}]},
    {"is_number": "IS 456 : 2000", "versions": [{"version_label": "2000", "is_current": True, "notes": ""}]},
    {"is_number": "IS 5120 : 1977", "versions": [{"version_label": "1977", "is_current": True, "notes": ""}]},
]

# QCO records (by is_number). DEMO — regulatory status is shown only from records.
DEMO_QCO: list[dict] = [
    {"is_number": "IS 302 : 2008", "qco_status": "MANDATORY", "product_description": "Household electrical appliances",
     "order_name": "Electrical Appliances (Quality Control) Order (DEMO)", "effective_date": "2021-01-01",
     "notes": "Registration mandatory before sale (illustrative)."},
    {"is_number": "IS 616 : 2017", "qco_status": "MANDATORY", "product_description": "Audio/video electronic apparatus",
     "order_name": "Electronics & IT Goods (CRS) Order (DEMO)", "effective_date": "2020-10-01",
     "notes": "Compulsory Registration Scheme (illustrative)."},
    {"is_number": "IS 1520 : 2007", "qco_status": "VOLUNTARY", "product_description": "Centrifugal water pumps",
     "order_name": "", "effective_date": None, "notes": "ISI marking voluntary (illustrative)."},
    {"is_number": "IS 456 : 2000", "qco_status": "UNKNOWN", "product_description": "Concrete works",
     "order_name": "", "effective_date": None, "notes": "No QCO record on file — verify."},
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
