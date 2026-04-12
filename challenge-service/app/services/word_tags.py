"""
word_tags.py — semantic tag dictionary for Finnish vocabulary.

Tags are assigned based on what the word MEANS, not what rarity it has.
This fixes the artificial tag system where Legendary always got combo tags
regardless of semantic meaning.

Effect types are still rarity-based (that's a game balance decision).
But content tags (bureaucracy, politeness, navigation, food, workplace)
are purely semantic — derived from the word itself.

The dictionary uses prefix matching so inflected forms are covered:
  "kahvi" matches "kahvia", "kahvin", "kahvikuppi" etc.

If a word is not in the dictionary, it gets no content tags.
Effect tags (shield, boost etc.) are still assigned by rarity in session_store.
"""

from app.services.content_rules import Tag

#
# Keys are Finnish word stems (lowercase). Values are lists of content tags.
# Prefix match — "kahvi" covers "kahvia", "kahvikuppi", "kahvimuki" etc.

WORD_TAG_MAP: dict[str, list[str]] = {

    # 
    "kahvi":        [Tag.FOOD],
    "tee":          [Tag.FOOD],
    "maito":        [Tag.FOOD],
    "vesi":         [Tag.FOOD],
    "mehu":         [Tag.FOOD],
    "olut":         [Tag.FOOD],
    "ruoka":        [Tag.FOOD],
    "leivon":       [Tag.FOOD],
    "pulla":        [Tag.FOOD],
    "kakku":        [Tag.FOOD],
    "sämpylä":      [Tag.FOOD],
    "lounas":       [Tag.FOOD],
    "aamupala":     [Tag.FOOD],
    "illallinen":   [Tag.FOOD],
    "annos":        [Tag.FOOD],
    "menu":         [Tag.FOOD],
    "laktoos":      [Tag.FOOD],
    "gluteeni":     [Tag.FOOD],
    "kasvis":       [Tag.FOOD],
    "liha":         [Tag.FOOD],
    "kala":         [Tag.FOOD],

    # 
    "kiitos":       [Tag.POLITENESS],
    "ole hyvä":     [Tag.POLITENESS],
    "anteeksi":     [Tag.POLITENESS],
    "terve":        [Tag.POLITENESS, Tag.GREETINGS],
    "hei":          [Tag.POLITENESS, Tag.GREETINGS],
    "moi":          [Tag.POLITENESS, Tag.GREETINGS],
    "heippa":       [Tag.POLITENESS, Tag.GREETINGS],
    "näkemiin":     [Tag.POLITENESS, Tag.GREETINGS],
    "hyvästi":      [Tag.POLITENESS, Tag.GREETINGS],
    "hyvää":        [Tag.POLITENESS],
    "ystävälli":    [Tag.POLITENESS],
    "kohtelias":    [Tag.POLITENESS],
    "pyydän":       [Tag.POLITENESS],
    "haluaisin":    [Tag.POLITENESS],
    "voisin":       [Tag.POLITENESS],
    "olisiko":      [Tag.POLITENESS],
    "saisinko":     [Tag.POLITENESS],

    # 
    "hakemus":      [Tag.BUREAUCRACY],
    "hakemu":       [Tag.BUREAUCRACY],
    "liite":        [Tag.BUREAUCRACY],
    "liittei":      [Tag.BUREAUCRACY],
    "todistus":     [Tag.BUREAUCRACY],
    "todistukse":   [Tag.BUREAUCRACY],  # covers todistuksen, todistukseen etc
    "lomake":       [Tag.BUREAUCRACY],
    "asiakirja":    [Tag.BUREAUCRACY],
    "henkilötunnu": [Tag.BUREAUCRACY],
    "henkilökortt": [Tag.BUREAUCRACY],
    "passi":        [Tag.BUREAUCRACY],
    "kela":         [Tag.BUREAUCRACY],
    "etuus":        [Tag.BUREAUCRACY],
    "tuki":         [Tag.BUREAUCRACY],
    "toimeentulo":  [Tag.BUREAUCRACY],
    "perustoimeent":[Tag.BUREAUCRACY],
    "sosiaali":     [Tag.BUREAUCRACY],
    "vakuutus":     [Tag.BUREAUCRACY],
    "päätös":       [Tag.BUREAUCRACY],
    "käsittely":    [Tag.BUREAUCRACY],
    "viranomais":   [Tag.BUREAUCRACY],
    "virasto":      [Tag.BUREAUCRACY],
    "toimisto":     [Tag.BUREAUCRACY, Tag.WORKPLACE],
    "asiointi":     [Tag.BUREAUCRACY],
    "rekisteröi":   [Tag.BUREAUCRACY],
    "ilmoitus":     [Tag.BUREAUCRACY],
    "liittää":      [Tag.BUREAUCRACY],
    "allekirjoitu": [Tag.BUREAUCRACY],
    "kopio":        [Tag.BUREAUCRACY],
    "irtisanomis":  [Tag.BUREAUCRACY, Tag.WORKPLACE],

    # 
    "työ":          [Tag.WORKPLACE],
    "työnantaja":   [Tag.WORKPLACE],
    "työntekijä":   [Tag.WORKPLACE],
    "työpaikka":    [Tag.WORKPLACE],
    "työsopimus":   [Tag.WORKPLACE],
    "palkka":       [Tag.WORKPLACE],
    "kokemus":      [Tag.WORKPLACE],
    "osaaminen":    [Tag.WORKPLACE],
    "taito":        [Tag.WORKPLACE],
    "ammatti":      [Tag.WORKPLACE],
    "tehtävä":      [Tag.WORKPLACE],
    "haastattelu":  [Tag.WORKPLACE],
    "haastatel":    [Tag.WORKPLACE],
    "hakija":       [Tag.WORKPLACE],
    "cv":           [Tag.WORKPLACE],
    "ansioluettelo":[Tag.WORKPLACE],
    "koulutus":     [Tag.WORKPLACE],
    "tutkinto":     [Tag.WORKPLACE],
    "innostunut":   [Tag.WORKPLACE],
    "motivoitun":   [Tag.WORKPLACE],
    "tiimi":        [Tag.WORKPLACE],
    "tiimipelaaja": [Tag.WORKPLACE],
    "johtaja":      [Tag.WORKPLACE],
    "esimies":      [Tag.WORKPLACE],
    "kolleega":     [Tag.WORKPLACE],
    "projekti":     [Tag.WORKPLACE],
    "aloituspäivä": [Tag.WORKPLACE],
    "sopimus":      [Tag.WORKPLACE],

    # 
    "vasen":        [Tag.NAVIGATION],
    "vasemm":       [Tag.NAVIGATION],  # covers vasemmalle, vasemmalla etc
    "oikea":        [Tag.NAVIGATION],
    "oikeal":       [Tag.NAVIGATION],  # covers oikealla, oikealle etc
    "suoraan":      [Tag.NAVIGATION],
    "eteenpäin":    [Tag.NAVIGATION],
    "taaksepäin":   [Tag.NAVIGATION],
    "ylös":         [Tag.NAVIGATION],
    "alas":         [Tag.NAVIGATION],
    "reitti":       [Tag.NAVIGATION],
    "kartta":       [Tag.NAVIGATION],
    "bussi":        [Tag.NAVIGATION],
    "bussipysäkki": [Tag.NAVIGATION],
    "raitiovaunu":  [Tag.NAVIGATION],
    "metro":        [Tag.NAVIGATION],
    "juna":         [Tag.NAVIGATION],
    "asema":        [Tag.NAVIGATION],
    "rautatieasema":[Tag.NAVIGATION],
    "lentokenttä":  [Tag.NAVIGATION],
    "satama":       [Tag.NAVIGATION],
    "keskusta":     [Tag.NAVIGATION],
    "liikennevalo": [Tag.NAVIGATION],
    "risteys":      [Tag.NAVIGATION],
    "katu":         [Tag.NAVIGATION],
    "tie":          [Tag.NAVIGATION],
    "osoite":       [Tag.NAVIGATION],
    "lähellä":      [Tag.NAVIGATION],
    "kaukana":      [Tag.NAVIGATION],
    "vieressä":     [Tag.NAVIGATION],
    "vastapäätä":   [Tag.NAVIGATION],
    "kulma":        [Tag.NAVIGATION],

    # 
    "yksi":         [Tag.NUMBERS],
    "kaksi":        [Tag.NUMBERS],
    "kolme":        [Tag.NUMBERS],
    "neljä":        [Tag.NUMBERS],
    "viisi":        [Tag.NUMBERS],
    "kuusi":        [Tag.NUMBERS],
    "seitsemän":    [Tag.NUMBERS],
    "kahdeksan":    [Tag.NUMBERS],
    "yhdeksän":     [Tag.NUMBERS],
    "kymmenen":     [Tag.NUMBERS],
    "euro":         [Tag.NUMBERS],
    "sentti":       [Tag.NUMBERS],
}


def get_semantic_tags(word_fi: str) -> list[str]:
    """
    Return semantic content tags for a Finnish word.

    Uses prefix matching — "kahvia" matches stem "kahvi".
    Returns empty list if word has no known semantic tags.

    This is intentionally separate from effect_type (which stays rarity-based).
    """
    word_lower = word_fi.lower().strip()

    # Exact match first
    if word_lower in WORD_TAG_MAP:
        return list(WORD_TAG_MAP[word_lower])

    # Prefix match — find longest matching stem
    matched_tags = []
    best_len = 0
    for stem, tags in WORD_TAG_MAP.items():
        if word_lower.startswith(stem) and len(stem) > best_len:
            matched_tags = tags
            best_len = len(stem)

    return list(matched_tags)
