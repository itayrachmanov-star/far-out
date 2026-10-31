// Question families for the Wikidata generator. Each family finds groups (a director, a country…)
// and their members (films, cities…). Patterns use ?g for the group and ?item for an answer.
// links: minimum Wikipedia language count for an answer; glinks: for the group itself.
const COUNTRY = ''; // country families take their groups from a list of countries; re-checking here made queries 8x slower
const series = (g) => g.replace(/ (video game )?series$/i, '').replace(/^The /, '');
const world = (g) => (/mythology$|'s /i.test(g) ? g : `the ${g}`);

// Group names as people say them: "the Netherlands", "China", "Ford", "Cardiff City". '' drops the group.
const NAMES = { 'United States of America': 'the United States', 'United States': 'the United States', 'United Kingdom': 'the United Kingdom',
  'People\'s Republic of China': 'China', 'Kingdom of the Netherlands': 'the Netherlands', Netherlands: 'the Netherlands', Philippines: 'the Philippines',
  'Czech Republic': 'the Czech Republic', 'Democratic Republic of the Congo': 'the Democratic Republic of the Congo', 'Republic of the Congo': 'the Republic of the Congo',
  'Central African Republic': 'the Central African Republic', 'Dominican Republic': 'the Dominican Republic', 'United Arab Emirates': 'the United Arab Emirates',
  Bahamas: 'the Bahamas', 'The Bahamas': 'the Bahamas', Gambia: 'the Gambia', 'The Gambia': 'the Gambia', Maldives: 'the Maldives', 'Solomon Islands': 'the Solomon Islands',
  'Soviet Union': 'the Soviet Union', 'British Broadcasting Corporation': 'the BBC', 'American Broadcasting Company': 'ABC', 'Fox Broadcasting Company': 'Fox',
  'Korean Broadcasting System': 'KBS', 'Munhwa Broadcasting Corporation': 'MBC', 'Seoul Broadcasting System': 'SBS', 'The CW': 'the CW', 'The WB': 'the WB',
  'The Walt Disney Company': 'Disney', 'The Weinstein Company': 'the Weinstein Company', 'The Cannon Group': 'the Cannon Group', 'broadcast syndication': '',
  'Audi AG': 'Audi', 'Tata Motors Limited': 'Tata Motors', 'AB Volvo': 'the Volvo Group', 'Mercedes-Benz Group': 'the Mercedes-Benz Group',
  'Volkswagen Group': 'the Volkswagen Group', 'American Motors Corporation': 'American Motors', 'Real Madrid Club de Fútbol': 'Real Madrid' };
const nice = (g) => (g in NAMES ? NAMES[g] : g.replace(/ (A\.F\.C\.|F\.C\.)$/, '').replace(/ Motor (Company|Corporation)$/, ''));

const families = [
  { id: 'director', theme: 'Movies', ask: (g) => `Name a film directed by ${g}`, what: (g) => `a film directed by ${g}`,
    pattern: '?item wdt:P31 wd:Q11424 ; wdt:P57 ?g .', links: 5, glinks: 15, limit: 350 },
  { id: 'starring', theme: 'Movies', ask: (g) => `Name a film starring ${g}`, what: (g) => `a film starring ${g}`,
    pattern: '?item wdt:P31 wd:Q11424 ; wdt:P161 ?g .', links: 8, glinks: 40, limit: 400 },
  { id: 'cast', theme: 'Movies', people: true, ask: (g) => `Name an actor from the film ${g}`, what: (g) => `an actor from ${g}`,
    pattern: '?g wdt:P31 wd:Q11424 ; wdt:P161 ?item .', links: 15, glinks: 60, limit: 400 },
  { id: 'tvcast', theme: 'TV', people: true, ask: (g) => `Name an actor from ${g}`, what: (g) => `an actor from ${g}`,
    pattern: '?g wdt:P31 wd:Q5398426 ; wdt:P161 ?item .', links: 10, glinks: 30, limit: 250 },
  { id: 'character', theme: 'Movies', ask: (g) => `Name a character or thing from ${g}`, what: (g) => `something from ${g}`,
    pattern: '?item wdt:P1441 ?g .', links: 2, glinks: 30, limit: 400 },
  { id: 'network', theme: 'TV', ask: (g) => `Name a TV show that aired on ${g}`, what: (g) => `a show that aired on ${g}`,
    pattern: '?item wdt:P31 wd:Q5398426 ; wdt:P449 ?g .', links: 10, glinks: 20, limit: 80 },
  { id: 'studio', theme: 'Movies', ask: (g) => `Name a film made by ${g}`, what: (g) => `a film made by ${g}`,
    pattern: '?item wdt:P31 wd:Q11424 ; wdt:P272 ?g .', links: 15, glinks: 20, limit: 80 },
  { id: 'author', theme: 'Books', ask: (g) => `Name a book by ${g}`, what: (g) => `a book by ${g}`,
    pattern: 'VALUES ?t { wd:Q7725634 wd:Q8261 wd:Q47461344 wd:Q571 } ?item wdt:P31 ?t ; wdt:P50 ?g .', links: 3, glinks: 20, limit: 300 },
  { id: 'album', theme: 'Music', ask: (g) => `Name an album by ${g}`, what: (g) => `an album by ${g}`,
    pattern: '?item wdt:P31 wd:Q482994 ; wdt:P175 ?g .', links: 3, glinks: 20, limit: 300 },
  { id: 'song', theme: 'Music', ask: (g) => `Name a song by ${g}`, what: (g) => `a song by ${g}`,
    pattern: 'VALUES ?t { wd:Q7366 wd:Q134556 } ?item wdt:P31 ?t ; wdt:P175 ?g .', links: 3, glinks: 20, limit: 300 },
  { id: 'painting', theme: 'Art', ask: (g) => `Name a painting by ${g}`, what: (g) => `a painting by ${g}`,
    pattern: '?item wdt:P31 wd:Q3305213 ; wdt:P170 ?g .', links: 2, glinks: 20, limit: 120 },
  { id: 'composer', theme: 'Music', ask: (g) => `Name a work by ${g}`, what: (g) => `a work by ${g}`,
    pattern: '?item wdt:P86 ?g . ?g wdt:P106 wd:Q36834 .', links: 3, glinks: 20, limit: 100 },
  { id: 'gameseries', theme: 'Games', ask: (g) => `Name a game in the ${series(g)} series`, what: (g) => `a game in the ${series(g)} series`,
    pattern: '?item wdt:P31 wd:Q7889 ; wdt:P179 ?g .', links: 3, glinks: 10, limit: 120 },
  { id: 'city', theme: 'Cities', ask: (g) => `Name a city in ${g}`, what: (g) => `a city in ${g}`,
    pattern: `VALUES ?t { wd:Q515 wd:Q1549591 wd:Q1637706 wd:Q5119 wd:Q200250 } ?item wdt:P31 ?t ; wdt:P17 ?g . ${COUNTRY}`, links: 10, countries: true, limit: 180 },
  { id: 'river', theme: 'Geography', ask: (g) => `Name a river in ${g}`, what: (g) => `a river in ${g}`,
    pattern: `?item wdt:P31 wd:Q4022 ; wdt:P17 ?g . ${COUNTRY}`, links: 8, countries: true, limit: 100 },
  { id: 'mountain', theme: 'Geography', ask: (g) => `Name a mountain in ${g}`, what: (g) => `a mountain in ${g}`,
    pattern: `?item wdt:P31 wd:Q8502 ; wdt:P17 ?g . ${COUNTRY}`, links: 6, countries: true, limit: 80 },
  { id: 'island', theme: 'Geography', ask: (g) => `Name an island that belongs to ${g}`, what: (g) => `an island of ${g}`,
    pattern: `?item wdt:P31 wd:Q23442 ; wdt:P17 ?g . ${COUNTRY}`, links: 6, countries: true, limit: 60 },
  { id: 'lake', theme: 'Geography', ask: (g) => `Name a lake in ${g}`, what: (g) => `a lake in ${g}`,
    pattern: `?item wdt:P31 wd:Q23397 ; wdt:P17 ?g . ${COUNTRY}`, links: 6, countries: true, limit: 60 },
  { id: 'attraction', theme: 'Travel', ask: (g) => `Name a tourist attraction in ${g}`, what: (g) => `a tourist attraction in ${g}`,
    pattern: `?item wdt:P31 wd:Q570116 ; wdt:P17 ?g . ${COUNTRY}`, links: 5, countries: true, limit: 80 },
  { id: 'museum', theme: 'Travel', ask: (g) => `Name a museum in ${g}`, what: (g) => `a museum in ${g}`,
    pattern: '?item wdt:P31 wd:Q33506 ; wdt:P131 ?g . ?g wdt:P31 wd:Q1637706 .', links: 5, glinks: 0, limit: 60 },
  { id: 'university', theme: 'School', ask: (g) => `Name a university in ${g}`, what: (g) => `a university in ${g}`,
    pattern: `?item wdt:P31 wd:Q3918 ; wdt:P17 ?g . ${COUNTRY}`, links: 10, countries: true, limit: 80 },
  { id: 'club', theme: 'Sport', ask: (g) => `Name a football club from ${g}`, what: (g) => `a football club from ${g}`,
    pattern: `?item wdt:P31 wd:Q476028 ; wdt:P17 ?g . ${COUNTRY}`, links: 15, countries: true, limit: 80 },
  { id: 'team', theme: 'Sport', people: true, ask: (g) => `Name a player who played for ${g}`, what: (g) => `a player who played for ${g}`,
    pattern: 'VALUES ?tt { wd:Q476028 wd:Q13393265 wd:Q17156793 wd:Q4498974 } ?g wdt:P31 ?tt . ?item wdt:P54 ?g .', links: 25, glinks: 60, limit: 200 },
  { id: 'carmaker', theme: 'Cars', ask: (g) => `Name a car made by ${g}`, what: (g) => `a car made by ${g}`,
    pattern: '?item wdt:P31 wd:Q3231690 ; wdt:P176 ?g .', links: 5, glinks: 10, limit: 60 },
  { id: 'dish', theme: 'Food', ask: (g) => `Name a dish from ${g}`, what: (g) => `a dish from ${g}`,
    pattern: `VALUES ?t { wd:Q746549 wd:Q2095 } ?item wdt:P31 ?t ; wdt:P495 ?g . ${COUNTRY}`, links: 3, countries: true, limit: 100 },
  { id: 'company', theme: 'Brands', ask: (g) => `Name a company from ${g}`, what: (g) => `a company from ${g}`,
    pattern: `VALUES ?t { wd:Q4830453 wd:Q891723 wd:Q6881511 } ?item wdt:P31 ?t ; wdt:P17 ?g . ${COUNTRY}`, links: 20, countries: true, limit: 60 },
  { id: 'dogbreed', theme: 'Animals', ask: (g) => `Name a dog breed from ${g}`, what: (g) => `a dog breed from ${g}`,
    pattern: `?item wdt:P31 wd:Q39367 ; wdt:P495 ?g . ${COUNTRY}`, links: 3, countries: true, limit: 20 },
  { id: 'myth', theme: 'Myths', ask: (g) => `Name a character or thing from ${world(g)}`, what: (g) => `something from ${world(g)}`,
    pattern: '?item wdt:P1080 ?g .', links: 5, glinks: 20, limit: 40 },
];

// "Name a French painter": occupation × country of citizenship, ranked by fame.
const occupations = [
  ['actor', 'Movies', 'Q33999 Q10800557 Q10798782'], ['singer', 'Music', 'Q177220'], ['rapper', 'Music', 'Q2252262'],
  ['composer', 'Music', 'Q36834'], ['guitarist', 'Music', 'Q855091'], ['painter', 'Art', 'Q1028181'], ['sculptor', 'Art', 'Q1281618'],
  ['photographer', 'Art', 'Q33231'], ['architect', 'Architecture', 'Q42973'], ['writer', 'Books', 'Q36180 Q6625963'], ['poet', 'Books', 'Q49757'],
  ['philosopher', 'Philosophy', 'Q4964182'], ['footballer', 'Sport', 'Q937857'], ['basketball player', 'Sport', 'Q3665646'],
  ['tennis player', 'Sport', 'Q10833314'], ['racing driver', 'Sport', 'Q378622 Q10841764'], ['cyclist', 'Sport', 'Q2309784'],
  ['boxer', 'Sport', 'Q11338576'], ['swimmer', 'Sport', 'Q10843402'], ['athlete', 'Sport', 'Q11513337'], ['golfer', 'Sport', 'Q13156709'],
  ['cricketer', 'Sport', 'Q12299841'], ['ice hockey player', 'Sport', 'Q11774891'], ['baseball player', 'Sport', 'Q10871364'],
  ['chess player', 'Games', 'Q10873124'], ['film director', 'Movies', 'Q2526255'], ['physicist', 'Science', 'Q169470'],
  ['chemist', 'Science', 'Q593644'], ['mathematician', 'Maths', 'Q170790'], ['inventor', 'Science', 'Q205375'], ['astronaut', 'Space', 'Q11631'],
  ['chef', 'Food', 'Q3499072'], ['fashion designer', 'Fashion', 'Q3501317'], ['model', 'Fashion', 'Q4610556'], ['comedian', 'TV', 'Q245068'],
  ['explorer', 'History', 'Q11900058'],
];
// Demonyms Wikidata spells oddly or has several of.
const DEMONYM = { 'United States of America': 'American', 'United Kingdom': 'British', 'Kingdom of the Netherlands': 'Dutch', Netherlands: 'Dutch',
  'People\'s Republic of China': 'Chinese', 'Republic of Ireland': 'Irish', 'Czech Republic': 'Czech', 'New Zealand': 'New Zealand', Philippines: 'Filipino',
  'South Korea': 'South Korean', 'North Korea': 'North Korean', Switzerland: 'Swiss', Denmark: 'Danish', Sweden: 'Swedish', Finland: 'Finnish',
  Poland: 'Polish', Spain: 'Spanish', Turkey: 'Turkish', Thailand: 'Thai', Iceland: 'Icelandic', Portugal: 'Portuguese', Wales: 'Welsh', Scotland: 'Scottish',
  England: 'English', France: 'French', Greece: 'Greek', Peru: 'Peruvian', Israel: 'Israeli', Iraq: 'Iraqi', Pakistan: 'Pakistani', Bangladesh: 'Bangladeshi' };

module.exports = { families, occupations, DEMONYM, nice };
