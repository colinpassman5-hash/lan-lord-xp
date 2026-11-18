// ============ LAN LORD — content definitions ============

export type Category = 'PCs' | 'Network' | 'Food & Drink' | 'Comfort' | 'Decor' | 'Weird';

export interface ItemDef {
  id: string;
  name: string;
  file: string;          // fake filename shown in Explorer
  cat: Category;
  cost: number;
  desc: string;
  useTile: boolean;      // needs a free tile in front (seat / standing spot)
  heat: number;          // heat emitted per minute when active
  idleHeat?: number;
  power: number;         // $/hour running cost
  quality?: number;      // PC tier 1..3
  routerRadius?: number;
  routerCap?: number;
  coolRadius?: number;
  cool?: number;
  decor?: number;        // happiness aura
  unlockedBy?: string;   // research id
  scenery?: boolean;     // pre-placed location prop: not buildable, not sellable
}

export const ITEMS: ItemDef[] = [
  { id: 'pc_beige', name: 'Beige Box 3000', file: 'BeigeBox3000.exe', cat: 'PCs', cost: 400, useTile: true,
    heat: 0.09, idleHeat: 0.01, power: 0.25, quality: 1,
    desc: 'Pentium 4. 512MB RAM. Smells faintly of Doritos. Runs CS 1.6 at a cinematic 24fps.' },
  { id: 'pc_gamer', name: 'Gamer Rig w/ LEDs', file: 'GamerRig_LEDs.exe', cat: 'PCs', cost: 1200, useTile: true,
    heat: 0.17, idleHeat: 0.02, power: 0.5, quality: 2, unlockedBy: 'r_gamer',
    desc: 'Core 2 Duo, 8800 GT, and 47 blue LEDs. The LEDs add +30 FPS (scientifically).' },
  { id: 'pc_xtreme', name: 'XTREME Skull Tower', file: 'XTREME_SKULL.exe', cat: 'PCs', cost: 3500, useTile: true,
    heat: 0.32, idleHeat: 0.04, power: 1.0, quality: 3, unlockedBy: 'r_xtreme',
    desc: 'Quad SLI. Liquid cooled with actual energy drink. Doubles as a space heater and a fire hazard.' },
  { id: 'router', name: 'Linksys Router', file: 'linksys_DEFAULT.exe', cat: 'Network', cost: 250, useTile: false,
    heat: 0.0, power: 0.05, routerRadius: 5, routerCap: 6,
    desc: 'Password is "admin". Supports up to 6 gamers before it starts crying.' },
  { id: 'router_pro', name: 'Mega Router (Pirated)', file: 'cisco_totally_legit.exe', cat: 'Network', cost: 900, useTile: false,
    heat: 0.01, power: 0.15, routerRadius: 8, routerCap: 16, unlockedBy: 'r_router',
    desc: 'Fell off a truck. Has 9 antennas. 3 of them do something.' },
  { id: 'ac', name: 'Window AC Unit', file: 'ac_unit_drippy.exe', cat: 'Comfort', cost: 500, useTile: false,
    heat: 0, power: 0.6, coolRadius: 3, cool: 0.55,
    desc: 'Drips on whoever sits near it. Keeps the XTREME towers from achieving fusion.' },
  { id: 'fridge', name: 'Energy Drink Fridge', file: 'LIQUID_DIABETES.exe', cat: 'Food & Drink', cost: 600, useTile: true,
    heat: 0.02, power: 0.2,
    desc: 'Stocked with LIQUID DIABETES™. 900mg caffeine per can. Not FDA approved. Not FDA aware.' },
  { id: 'vending', name: 'Hot Pocket Machine', file: 'hotpocket_dispenser.exe', cat: 'Food & Drink', cost: 450, useTile: true,
    heat: 0.03, power: 0.2,
    desc: 'Lava on the outside. Frozen on the inside. Exactly like the real thing.' },
  { id: 'toilet', name: 'Toilet', file: 'toilet.exe', cat: 'Comfort', cost: 350, useTile: true,
    heat: 0, power: 0,
    desc: 'One (1) toilet. Gamers will hold it for 6 hours rather than leave a match. Plan accordingly.' },
  { id: 'trash', name: 'Trash Can', file: 'recycle_bin_irl.exe', cat: 'Comfort', cost: 60, useTile: false,
    heat: 0, power: 0, decor: 0.2,
    desc: 'Gamers will throw trash at it from up to 5 tiles away. They will miss.' },
  { id: 'couch', name: 'Nap Couch', file: 'couch_of_shame.exe', cat: 'Comfort', cost: 300, useTile: true,
    heat: 0, power: 0, unlockedBy: 'r_couch',
    desc: 'For sleeping between raids. Has seen things. Do not blacklight.' },
  { id: 'shower', name: 'Mandatory Shower', file: 'shower_FORCED.exe', cat: 'Comfort', cost: 800, useTile: true,
    heat: 0.01, power: 0.1, unlockedBy: 'r_shower',
    desc: 'Some customers have never seen one. They will scream. It is for the greater good.' },
  { id: 'plant', name: 'Fake Plant', file: 'plant_fake.exe', cat: 'Decor', cost: 80, useTile: false,
    heat: 0, power: 0, decor: 0.6,
    desc: 'Plastic. Dusty. Llamas love eating it anyway.' },
  { id: 'lavalamp', name: 'Lava Lamp', file: 'lava_lamp.exe', cat: 'Decor', cost: 120, useTile: false,
    heat: 0.01, power: 0.02, decor: 0.9,
    desc: 'Radiates pure 2008 energy. Hypnotizes nearby gamers into staying 10% longer.' },
  { id: 'ddr', name: 'DDR Machine', file: 'DDR_EXTREME_import.exe', cat: 'Weird', cost: 1800, useTile: true,
    heat: 0.06, power: 0.4, decor: 1.2, unlockedBy: 'r_ddr',
    desc: 'Plays BUTTERFLY at 140 dB forever. Fun aura for nearby customers. Sweat aura too.' },
  { id: 'ballpit', name: 'Ball Pit (??)', file: 'why_is_this_here.exe', cat: 'Weird', cost: 2500, useTile: false,
    heat: 0, power: 0, decor: 2.0, unlockedBy: 'r_ballpit',
    desc: 'Nobody asked for this. Everybody loves it. Something lives at the bottom.' },
  { id: 'shrine', name: 'Shrine to Leeroy', file: 'LEEROOOOY.exe', cat: 'Weird', cost: 666, useTile: false,
    heat: 0.01, power: 0, decor: 0.5, unlockedBy: 'r_shrine',
    desc: 'At least he has chicken. Calms the rage of nearby gamers through sheer reverence.' },
];

ITEMS.push(
  { id: 'washer', name: "Mom's Washing Machine", file: 'washer.exe', cat: 'Decor', cost: 0, useTile: false, heat: 0.01, power: 0, scenery: true, desc: 'Runs at 3am. Shakes the whole house. Contains at least one sock from 1997.' },
  { id: 'dryer', name: "Mom's Dryer", file: 'dryer.exe', cat: 'Decor', cost: 0, useTile: false, heat: 0.05, power: 0, scenery: true, desc: 'Someone left pizza in here. It is now a frisbee.' },
  { id: 'heater', name: 'Water Heater', file: 'water_heater.exe', cat: 'Decor', cost: 0, useTile: false, heat: 0.06, power: 0, scenery: true, desc: 'Makes noises like a dying robot. Do not make eye contact.' },
  { id: 'boxes', name: 'Christmas Decoration Boxes', file: 'xmas_boxes.exe', cat: 'Decor', cost: 0, useTile: false, heat: 0, power: 0, scenery: true, desc: 'Mom says do NOT touch these. They are load-bearing.' },
  { id: 'stage', name: 'Tournament Stage', file: 'stage.exe', cat: 'Decor', cost: 0, useTile: false, heat: 0.02, power: 0, scenery: true, decor: 1.5, desc: 'Where legends are made and keyboards are thrown.' },
  { id: 'trophy', name: 'Trophy Case', file: 'trophies.exe', cat: 'Decor', cost: 0, useTile: false, heat: 0, power: 0, scenery: true, decor: 1.0, desc: 'Every trophy you ever won. Plus one you bought on eBay.' },
);
export const ITEM: Record<string, ItemDef> = Object.fromEntries(ITEMS.map(i => [i.id, i]));

// ---------------- Research = Windows Update ----------------
export interface ResearchDef { id: string; name: string; kb: string; cost: number; hours: number; desc: string; requires?: string; }
export const RESEARCH: ResearchDef[] = [
  { id: 'r_gamer', name: 'Gamer Rig Driver Pack', kb: 'KB000420', cost: 1500, hours: 6, desc: 'Unlocks Gamer Rig w/ LEDs. Also installs 3 toolbars.' },
  { id: 'r_couch', name: 'Comfy Couch.dll', kb: 'KB001337', cost: 500, hours: 3, desc: 'Unlocks Nap Couch. Sleepers stop drooling on keyboards.' },
  { id: 'r_router', name: 'Cisco Mega Router Crack', kb: 'KB002600', cost: 2000, hours: 8, desc: 'Unlocks the Pirated Mega Router (16 gamers, huge range).' },
  { id: 'r_shower', name: 'Personal Hygiene Patch', kb: 'KB000666', cost: 1200, hours: 6, desc: 'Unlocks Mandatory Shower. Critical security update for your nose.' },
  { id: 'r_antivirus', name: 'Norton Antivirus 2009', kb: 'KB009001', cost: 800, hours: 4, desc: 'Blocks 90% of LimeWire viruses. Makes everything 40% slower (cosmetically).' },
  { id: 'r_ups', name: 'UPS Battery Backup', kb: 'KB000911', cost: 1500, hours: 6, desc: 'Power outages no longer interrupt raids. Lives saved: many.' },
  { id: 'r_shrine', name: 'Leeroy Jenkins Shrine', kb: 'KB000050', cost: 900, hours: 4, desc: 'Unlocks the Shrine. 32.33% (repeating of course) less rage.' },
  { id: 'r_bouncer', name: 'Bouncer License', kb: 'KB000086', cost: 1000, hours: 4, desc: 'Lets you hire Large Tony, who escorts ragers out before they smash stuff.' },
  { id: 'r_ddr', name: 'DDR Import (Japan)', kb: 'KB008008', cost: 1800, hours: 8, desc: 'Unlocks DDR Machine. Instructions are in Japanese. Nobody reads them anyway.' },
  { id: 'r_xtreme', name: 'XTREME Skull Firmware', kb: 'KB031337', cost: 5000, hours: 12, desc: 'Unlocks the XTREME Skull Tower. Gamers pay big. Fire department on speed-dial.', requires: 'r_gamer' },
  { id: 'r_fiber', name: 'Fiber Optic (more cables)', kb: 'KB010101', cost: 3000, hours: 10, desc: 'All routers +50% capacity. It\'s just regular cables painted orange.' },
  { id: 'r_ballpit', name: 'Ball Pit (Why?)', kb: 'KB0WHY00', cost: 2500, hours: 8, desc: 'Unlocks Ball Pit. Our lawyers have advised us not to describe it.' },
];

// ---------------- Customers ----------------
export type Arche = 'kid' | 'tryhard' | 'neckbeard' | 'normie' | 'weirdo';
export interface ArcheDef { id: Arche; label: string; will: number; cash: [number, number]; hours: [number, number];
  hungerM: number; thirstM: number; smellM: number; rageM: number; weight: number; }
export const ARCHES: ArcheDef[] = [
  { id: 'kid', label: 'Middle Schooler', will: 3.5, cash: [15, 40], hours: [2, 6], hungerM: 1.2, thirstM: 1.3, smellM: 0.8, rageM: 1.6, weight: 3 },
  { id: 'tryhard', label: 'Pro Gamer (Self-Proclaimed)', will: 7, cash: [40, 120], hours: [3, 8], hungerM: 0.8, thirstM: 1.4, smellM: 1.0, rageM: 1.8, weight: 2 },
  { id: 'neckbeard', label: 'Raid Leader', will: 5, cash: [50, 160], hours: [6, 16], hungerM: 1.4, thirstM: 1.0, smellM: 2.2, rageM: 1.0, weight: 2 },
  { id: 'normie', label: 'Normal Guy (Lost?)', will: 4.5, cash: [20, 70], hours: [1, 3], hungerM: 1.0, thirstM: 1.0, smellM: 0.6, rageM: 0.7, weight: 2 },
  { id: 'weirdo', label: 'Mysterious Regular', will: 6, cash: [30, 200], hours: [3, 12], hungerM: 1.0, thirstM: 1.0, smellM: 1.4, rageM: 0.9, weight: 1 },
];

const PREFIX = ['xX_', 'xXx_', '~*', 'Dark', 'L33t', 'Pwn', 'Sn1per', 'Mr', 'Lord', 'Big', 'MLG_', 'Captain', '', '', ''];
const ROOT = ['Kevin', 'Slayer', 'Haxx0r', 'N00bKiller', 'Ashley', 'Dragon', 'Ninja', 'Pwnage', 'Goku', 'Legolas', 'Brandon',
  'Shadow', 'Doritos', 'Mtn_Dew', 'Raptor', 'Tyler', 'Chungus', 'Frag', 'Rofl', 'Tbag', 'Gandalf', 'Kyle', 'Steve', 'Headshot', 'Wizard', 'Grandma'];
const SUFFIX = ['_Xx', 'xXx', '*~', '1337', '99', '_2008', '420', '69', '_Pro', 'Zilla', '_LOL', '', '007', '_TTV', 'Jr'];
export function genName(r: () => number): string {
  const p = PREFIX[Math.floor(r() * PREFIX.length)];
  const root = ROOT[Math.floor(r() * ROOT.length)];
  let s = SUFFIX[Math.floor(r() * SUFFIX.length)];
  if (p === 'xX_' && r() < 0.8) s = '_Xx';
  if (p === '~*') s = '*~';
  return p + root + s;
}

// ---------------- Thoughts (fully absurd) ----------------
export const THOUGHTS: Record<string, string[]> = {
  ping: ['PING 999!!!', 'LAG!!! I SHOT HIM FIRST', 'is this wifi powered by a hamster', 'my packets are lost and scared', 'I am teleporting. this is not a feature', 'rubberbanding into another dimension'],
  noNet: ['NO INTERNET?? this is just a room with computers', 'I paid to play SOLITAIRE?', 'the internet is gone. am I dead?'],
  hot: ['it\'s like a sauna in here', 'my eyebrows are melting', 'is the PC supposed to glow orange', 'I can see heat waves', 'my mouse is soup now'],
  smell: ['I can smell my teammate', 'something died in this row', 'the air has a FLAVOR', 'my eyes are watering', 'who brought the cheese'],
  hungry: ['I\'d sell my mom for a Hot Pocket', 'need food. even floor pizza', 'stomach is louder than my headset'],
  noFood: ['no food?? I\'m eating my mousepad', 'is this keyboard edible'],
  thirsty: ['need LIQUID DIABETES', 'my blood is 40% energy drink', 'heart going brrrrr. need more'],
  noDrink: ['no drinks?? I\'m licking the AC unit'],
  bladder: ['I CAN\'T PAUSE AN ONLINE GAME', 'holding it like a champion', 'bladder at 110%', 'it\'s fine. it\'s fine. it\'s fine.'],
  noToilet: ['no toilet?? ok then.', 'there is no toilet. there is only the corner.'],
  accident: ['...nobody saw that', 'it\'s a LAN tradition', 'I\'m not moving. I\'m winning.'],
  happy: ['this place is so random lol', 'best LAN EVER', 'I live here now', 'pwning n00bs all day', 'this is the best day of my life', 'I have achieved gamer nirvana', 'never going outside again'],
  rage: ['HAX!!!', 'REPORTED', 'I WAS LAGGING', 'GG NO RE', 'CAMPER!!!', 'my controller slipped (it\'s a keyboard)', 'THAT DIDN\'T COUNT'],
  ragequit: ['UNINSTALL!!!', 'THIS GAME IS RIGGED', 'I\'M TELLING MY MOM', '*KEYBOARD NOISES*'],
  tired: ['five more minutes...', 'sleep is for the weak... zzz', 'my eyes are 90% red'],
  price: ['$%r/hr?? I could buy an Xbox', '$%r/hr is highway robbery', 'I\'m not paying $%r for this'],
  pricey: ['kinda pricey but ok', 'there goes my lunch money'],
  litter: ['the floor is sticky', 'why is there pizza on the ceiling', 'I stepped in something warm'],
  virus: ['BONZI BUDDY IS ON MY SCREEN', 'I didn\'t download anything I SWEAR', 'FREE IPOD?! CLICK HERE?!', '47 toolbars just installed', 'my PC is speaking Russian'],
  ghost: ['THERE\'S A GHOST IN HERE', 'the ghost took my seat', 'ghost is better at CS than me'],
  llama: ['the llama is judging me', 'why is there a llama', 'llama ate my Hot Pocket', 'llama.'],
  noPC: ['all PCs taken?? lame', 'I\'ll wait. I have nowhere else to be. ever.'],
  waitLong: ['I\'ve been waiting FOREVER', 'leaving. this place sucks'],
  mom: ['MOM NO I\'M IN A RAID', '5 MORE MINUTES MOM', 'MOM YOU\'RE EMBARRASSING ME'],
  momSays: ['DINNER WAS 4 HOURS AGO', 'YOU HAVE SCHOOL TOMORROW', 'IS THIS THE DUNGEONS AND DRAGONS'],
  outage: ['THE POWER?!?!', 'MY RAID!!! MY LOOT!!!', 'darkness. pure darkness.'],
  rickroll: ['never gonna give you... WAIT', 'I just got RICKROLLED', 'never gonna let you down ♪'],
  fire: ['FIRE!!! (still playing though)', 'it\'s getting toasty', 'is that part of the game?'],
  decor: ['ooh a lava lamp', 'that ball pit is calling to me', 'nice vibes in here'],
  tourney: ['TOURNAMENT TIME!!!', 'I\'m gonna win this. I trained 4 hours', 'prize money = new GPU'],
  leaveHappy: ['GG. see you tomorrow', 'I\'ll be back. I\'m always back.', 'best $%m I ever spent'],
  broke: ['out of money. selling my kidney brb'],
  sleepCouch: ['nap time on the couch of shame'],
  shower: ['WHAT IS THIS WATER', 'I feel... clean? I hate it'],
  queue: ['#%n in line. basically a raid queue', '#%n in line. i can wait. i have no life'],
  queueFront: ['im NEXT. dont even think about it', 'front of the line baby'],
  queueBored: ['playing snake on my Razr', 'T9 texting my mom "im fine"'],
  savedSeat: ['PC #%n has a jacket on it. respect the jacket', 'BRB note on that one. fair'],
  seatSaver: ['BRB. touch my mouse and die', 'jacket on chair = seat is SAVED'],
  seatLost: ['someone took my seat?? i was gone 5 min', 'my jacket... is on the floor...'],
  switchSeat: ['this PC has no internet. MOVING', 'upgrading to a PC that works'],
  clanArrive: ['CLAN NIGHT BOIS', 'we roll deep (3 of us)'],
  clanTogether: ['sitting w the squad', 'clan formation: ACTIVATED'],
  clanApart: ['they split up our clan?? rude', 'cant even trash talk my bro from here'],
  clanBanter: ['dude behind u', 'lol ur so bad', 'cover me cover me'],
  trashTalk: ['git gud neighbor', 'thats what u get lol'],
  cheer: ['LETS GOOOO', 'NICE SHOT DUDE'],
  consoleNeighbor: ['its ok man. its just a game', 'deep breaths bro'],
  banger: ['this song SLAPS', 'who made this playlist?? marry me', '*headbangs at keyboard*', 'turn it UP', 'this is my jam (since 2004)'],
  cursedMusic: ['is that... a goat?', 'what is this music. what is happening', 'who downloaded this from LimeWire', 'my ears are lagging', 'this song has a virus. i can feel it'],
};

// ---------------- Reviews ----------------
export const REVIEWS: Record<number, string[]> = {
  5: ['best LAN cafe in the tri-county area!!!1 i live here now', '10/10 got 40 kills and a hot pocket', 'i cried. good tears. 5 stars', 'my wife left me but this place is great', 'RAWR XD best place ever!!!! thanks 4 the add'],
  4: ['pretty good but my seat was warm. like TOO warm', 'solid. the fridge hums the zelda theme', 'would LAN again. would bring deodorant next time', 'great vibes, mid snacks'],
  3: ['it was ok. a guy looked at me', 'mid. the wifi went to the bathroom twice', 'pc was fine. the guy next to me was not', '3 stars. one for each hot pocket'],
  2: ['2/5 stars smelled like feet', 'lag lag lag lag', 'keyboard was sticky in a way i cant explain', 'pretty sure i got a virus. on my body'],
  1: ['my PC smelled like burnt hair. 1 star', 'ALL HAX. this place is rigged', 'worst lan ever. my ping was my age', 'i will be telling everyone on myspace'],
};
export const REVIEW_SPECIAL: Record<string, string[]> = {
  fire: ['a PC caught fire next to me and nobody cared. 2 stars, i was winning', 'the computer was ON FIRE. like actual fire'],
  ragequit: ['broke a keyboard. it was the keyboards fault', 'RIGGED!!!! 1 STAR!!!!'],
  mom: ['my mom showed up. thanks for nothing', 'MOM IF YOU READ THIS IM SORRY'],
  accident: ['no toilet. i adapted. 2 stars', 'had an accident. still beat my high score'],
  smell: ['someone smelled like a dumpster that ate a dumpster', 'the smell had its own ping'],
  ghost: ['a ghost camped my spawn', 'ghost was cool actually. 4 stars for the ghost'],
  llama: ['there was a llama. no further comments', 'the llama ate my homework (my mousepad)'],
  virus: ['my screen got BONZI BUDDY. i miss him already', 'clicked free ipod. no ipod.'],
  bounced: ['large tony carried me out like a baby. 1 star but respect', 'got escorted out by a guy the size of a fridge'],
  shower: ['they FORCED me to shower. human rights violation. 4 stars', 'shower was cold. soul is clean now'],
  tourney: ['TOURNAMENT WAS EPIC. got 2nd. it was hax', 'tourney was hype, lost to a 9 year old'],
};

// ---------------- Advisor (MSN) ----------------
export const ADVISOR_NAME = '~*DaRk_AdViSoR*~';
export const ADVISOR: Record<string, string[]> = {
  welcome: ['heyyy!!! ur LAN cafe is OPEN :D', 'i set u up w/ some beige boxes n a router. place more stuff from the Build window lol', 'PROTIP: routers = internet. no internet = riot. trust me', 'also heat is real. PCs in a clump get HOT. buy AC or get fire', 'goals r in goals.txt on the desktop. dont let me down bro'],
  fire: ['OMG UR PC IS ON FIRE LOL', 'click it 2 put it out ($100). or hire Dave the IT guy on craigslist'],
  ragequit: ['some kid just SMASHED a keyboard lmao', 'broken PCs need repair. click it or hire a tech'],
  noNet: ['ppl r complaining about NO INTERNET. put PCs near routers!!! turn on WiFi overlay'],
  ping: ['ur router is overloaded lol. 1 linksys = ~6 gamers. buy more'],
  hot: ['its getting HOT in there. turn on Heat overlay. AC units bro'],
  smell: ['someone STINKS. like bad. research the Hygiene Patch n get a shower'],
  accident: ['uh. someone had an accident. u need a toilet. or 2. or 5'],
  noFood: ['ppl r STARVING lol. buy a Hot Pocket machine (Food & Drink)'],
  litter: ['ur floor is gross. trash cans + a janitor = happy nose'],
  death: ['dude.. did a guy just DIE from gaming 48 hrs straight?? thats so 2008'],
  virus: ['LIMEWIRE VIRUS DETECTED lol. click an infected PC → "Format ALL infected" ($15 each). or hire an IT guy. Norton (Research) stops it'],
  outage: ['POWER OUTAGE!!! everyone is screaming lol. UPS battery backup fixes this'],
  mom: ['a mom just walked in. RIP that kid'],
  llama: ['why is there a llama in ur cafe. i didnt do it. (i did it)'],
  inspector: ['HEALTH INSPECTOR incoming!!! hide the puddles!!!'],
  rickroll: ['lol i rickrolled every PC in ur cafe. ur welcome'],
  tip1: ['protip: gamers need a ROUTER in range or they riot. hit WiFi in the top bar to see coverage'],
  tip2: ['when building press R to rotate stuff. the blue tile = where ppl sit/stand, it has to be reachable'],
  tip3: ['if a PC gets a ☠️ thats LimeWire. click the PC → Format ALL infected. it spreads thru the router so do them all at once lol'],
  tip4: ['see a yellow puddle or trash w/ a sparkle? click it to clean ($5). or hire a janitor on Staff. ppl HATE gross floors'],
  broke: ['bro ur broke. borrow from mom in Excel (finance) b4 the repo guy comes'],
  rich: ['$$$ ur getting rich bro. buy more stuff. buy a ball pit. live ur life'],
  wotlk: ['WRATH OF THE LICH KING IS OUT!!! every nerd in town is coming. GET MORE PCS'],
  halloween: ['happy halloween!!! everyone is in costume lol (pumpkin heads)'],
  tourneyStart: ['TOURNAMENT IS LIVE!!! entry fee $15 each. pray nothing catches fire'],
  tourneyEnd: ['tourney over!!! that was HYPE'],
  research: ['update installed! check Build for new stuff'],
  chat: ['lol', 'ya', 'brb', 'idk lol', 'ok', 'k', 'thats what she said', 'brb mom needs the phone line', 'did u see the new myspace layout', 'stop typing at me im in a raid', 'u got this bro', ':P', 'rofl', 'lmao ok', 'who is this', 'g2g'],
};

export const NEWS_TICKER = [
  'BREAKING: Local LAN cafe smells "like victory and feet", says nobody',
  'iPhone 3G sold out again; LAN owners unaffected, still using Razr',
  'Scientists confirm: Hot Pockets reach temperature of the sun, center remains -40°',
  'Wrath of the Lich King launches Nov 13 — local productivity expected to drop 400%',
  'Man who has played Counter-Strike since 1999 still "warming up"',
  'Myspace Top 8 drama tears families apart nationwide',
  'Study: 9 out of 10 gamers "were lagging"',
  'Steam announces sale; wallets everywhere file for bankruptcy',
  'Area mom "just wants to know if he\'s eating"',
  'Leeroy Jenkins still not here, has chicken',
];

export const START_DATE = { y: 2008, m: 9, d: 3, h: 10 }; // legacy default; locations override
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


// ================================================================ PRESTIGE: locations
export interface GoalDef { serve: number; cash: number; rating: number; crowd: number; }
export interface LocationDef {
  id: string; name: string; short: string; chapter: string; year: number; month: number; day: number;
  w: number; h: number; doorY: number; startCash: number; rent: number; rentLabel: string;
  spawnMult: number; payMult: number; clout: number; goals: GoalDef;
  theme: { wall: string; wallR: string; trim: string; floorA: string; floorB: string; confetti: boolean; sign: string; signColor: string; posters: [string, string, string][]; outside: 'stairs' | 'sidewalk' | 'carpet'; };
  starter: [string, number, number, number][];
  story: string[];
}
export const LOCATIONS: LocationDef[] = [
  {
    id: 'basement', name: "Mom's Basement", short: 'Basement', chapter: 'Chapter 1: The Basement Years', year: 2004, month: 8, day: 10,
    w: 11, h: 9, doorY: 6, startCash: 1500, rent: 25, rentLabel: 'Mom Tax',
    spawnMult: 0.6, payMult: 1.0, clout: 10,
    goals: { serve: 30, cash: 3000, rating: 3.5, crowd: 6 },
    theme: { wall: '#9a958a', wallR: '#878276', trim: '#4a463e', floorA: '#6b4f3a', floorB: '#735641', confetti: false, sign: 'DUNGEON LAN', signColor: '#ff3b3b',
      posters: [['#1b4332', 'HALO 2', '#95d5b2'], ['#3c096c', 'NO GIRLS', '#ffd6ff'], ['#7f5539', 'CHORES:', '#fff']], outside: 'stairs' },
    starter: [['pc_beige', 4, 2, 1], ['pc_beige', 5, 2, 1], ['router', 3, 1, 0], ['washer', 9, 0, 1], ['dryer', 10, 0, 1], ['heater', 10, 3, 0], ['boxes', 0, 0, 0]],
    story: [
      'FALL 2004.',
      'You just dropped out of Tri-County Community College. (Major: undecided. Minor: Halo 2.)',
      'Your mom says get a job. Your dad says nothing, because he lives in Florida now.',
      'You have $1,500, two beige PCs from a garage sale, and a dream.',
      'The dream is a LAN party. Every day. Forever. In the basement.',
      'Mom says it\'s fine "as long as you do the laundry." You will not do the laundry.',
    ],
  },
  {
    id: 'stripmall', name: 'Tri-County Plaza, Unit 4B', short: 'Strip Mall', chapter: 'Chapter 2: Between a Vape Shop and a Tax Place', year: 2006, month: 2, day: 6,
    w: 15, h: 11, doorY: 8, startCash: 6000, rent: 120, rentLabel: 'Rent',
    spawnMult: 0.9, payMult: 1.3, clout: 25,
    goals: { serve: 70, cash: 12000, rating: 3.8, crowd: 12 },
    theme: { wall: '#e8dcc0', wallR: '#d8cba9', trim: '#7a5c3a', floorA: '#d9d9d9', floorB: '#bfbfbf', confetti: false, sign: 'LAN LORD', signColor: '#00e5ff',
      posters: [['#023e8a', 'COUNTER', '#90e0ef'], ['#6a040f', 'WORLD OF', '#ffd60a'], ['#2d6a4f', 'HALF-WIT 2', '#ffb703']], outside: 'sidewalk' },
    starter: [['pc_beige', 5, 3, 1], ['pc_beige', 6, 3, 1], ['pc_beige', 7, 3, 1], ['router', 6, 1, 0], ['fridge', 11, 2, 1], ['toilet', 14, 1, 1], ['trash', 9, 6, 0]],
    story: [
      'SPRING 2006.',
      'Mom found out about the "accidents." You have been evicted from your own childhood.',
      'Luckily, the basement made you $5,000 and a local legend among 13-year-olds.',
      'You lease Unit 4B at Tri-County Plaza. Neighbors: a vape shop, a tax place, and "Bob\'s Internet & Bait Shop."',
      'Bob looks at you through the window. Bob does not blink.',
      'It\'s a real business now. You bought a tie. You wore it once.',
    ],
  },
  {
    id: 'blockbuster', name: 'The Old Blockbuster', short: 'Blockbuster', chapter: 'Chapter 3: Be Kind, Reboot', year: 2008, month: 9, day: 3,
    w: 20, h: 14, doorY: 11, startCash: 12000, rent: 250, rentLabel: 'Rent',
    spawnMult: 1.0, payMult: 1.6, clout: 50,
    goals: { serve: 140, cash: 35000, rating: 4.0, crowd: 20 },
    theme: { wall: '#c9d6e8', wallR: '#b4c4dc', trim: '#2b3a55', floorA: '#26305e', floorB: '#2b366a', confetti: true, sign: 'LAN LORD', signColor: '#00e5ff',
      posters: [['#2d6a4f', 'HALF-WIT 2', '#ffb703'], ['#5a189a', 'WORLD OF', '#ffd60a'], ['#9d0208', 'LEEROY', '#fff'], ['#023e8a', 'COUNTER', '#90e0ef'], ['#003399', 'BE KIND', '#ffd60a']], outside: 'sidewalk' },
    starter: [['pc_beige', 6, 3, 1], ['pc_beige', 7, 3, 1], ['pc_beige', 8, 3, 1], ['pc_beige', 9, 3, 1], ['router', 8, 1, 0], ['fridge', 14, 2, 1], ['toilet', 18, 1, 1], ['trash', 11, 6, 0], ['plant', 3, 1, 0]],
    story: [
      'FALL 2008.',
      'The economy is collapsing. The local Blockbuster has closed. You have never been more excited.',
      'You buy the lease. The carpet still smells like popcorn and late fees.',
      'Bob\'s Internet & Bait Shop is losing. Bob has started selling worms to your customers in the parking lot.',
      'Wrath of the Lich King comes out in November. Prepare yourself.',
    ],
  },
  {
    id: 'warehouse', name: 'Warehouse 13 LAN Arena', short: 'Warehouse', chapter: 'Chapter 4: BIGGER. LOUDER. HOTTER.', year: 2010, month: 5, day: 4,
    w: 26, h: 17, doorY: 14, startCash: 25000, rent: 500, rentLabel: 'Rent',
    spawnMult: 1.6, payMult: 2.0, clout: 100,
    goals: { serve: 260, cash: 90000, rating: 4.2, crowd: 35 },
    theme: { wall: '#5c6370', wallR: '#4b515c', trim: '#ffb703', floorA: '#7d8085', floorB: '#73767b', confetti: false, sign: 'LAN LORD ARENA', signColor: '#ff2bd6',
      posters: [['#111', 'STARCRAFT II', '#4cc9f0'], ['#1d3557', 'LEAGUE OF', '#ffd60a'], ['#9d0208', 'MLG PRO', '#fff'], ['#2b2d42', 'MINECRAFT?', '#80ed99']], outside: 'sidewalk' },
    starter: [['pc_gamer', 8, 4, 1], ['pc_gamer', 9, 4, 1], ['pc_gamer', 10, 4, 1], ['pc_gamer', 11, 4, 1], ['router_pro', 10, 2, 0], ['fridge', 18, 2, 1], ['toilet', 24, 1, 1], ['toilet', 25, 1, 1], ['trash', 13, 7, 0], ['stage', 4, 0, 1], ['stage', 5, 0, 1], ['ac', 14, 4, 0]],
    story: [
      'SUMMER 2010.',
      'StarCraft II is out. Gamers now have "APM." You don\'t know what it means but you charge extra for it.',
      'You lease an entire warehouse. It used to store frozen fish. It still sort of does.',
      'There is a STAGE. There are SPONSORS (a local energy drink called "VOLT JUICE"). There are LIGHTS.',
      'Bob\'s Internet & Bait Shop is now just a Bait Shop. Bob sends you a single worm in the mail. You frame it.',
    ],
  },
  {
    id: 'tower', name: 'LAN LORD TOWER', short: 'The Tower', chapter: 'Chapter 5: The eSports Mega-Compound', year: 2012, month: 11, day: 1,
    w: 32, h: 20, doorY: 17, startCash: 60000, rent: 1200, rentLabel: 'Rent',
    spawnMult: 2.4, payMult: 2.6, clout: 200,
    goals: { serve: 500, cash: 250000, rating: 4.5, crowd: 60 },
    theme: { wall: '#1a1a2e', wallR: '#16162a', trim: '#b14aed', floorA: '#141428', floorB: '#191932', confetti: true, sign: 'LAN LORD TOWER', signColor: '#b14aed',
      posters: [['#000', 'THE INTERNATIONAL', '#ff4d6d'], ['#240046', 'LAN LORD', '#e0aaff'], ['#03045e', 'EST. 2004', '#90e0ef'], ['#370617', 'BASEMENT', '#ffba08'], ['#111', 'NEVER LOG OFF', '#80ed99']], outside: 'carpet' },
    starter: [['pc_xtreme', 10, 5, 1], ['pc_xtreme', 11, 5, 1], ['pc_xtreme', 12, 5, 1], ['pc_xtreme', 13, 5, 1], ['router_pro', 12, 2, 0], ['ac', 15, 5, 0], ['ac', 9, 5, 0], ['fridge', 22, 2, 1], ['vending', 23, 2, 1], ['toilet', 29, 1, 1], ['toilet', 30, 1, 1], ['toilet', 31, 1, 1], ['trash', 16, 8, 0], ['stage', 4, 0, 1], ['stage', 5, 0, 1], ['stage', 6, 0, 1], ['trophy', 2, 0, 1]],
    story: [
      'WINTER 2012.',
      'The Mayans said the world would end this year. Instead, you opened a TOWER.',
      'Seven floors. Well, one floor. The other six are "under construction" (it\'s Bob\'s bait storage now).',
      'Pro teams fly in. Streamers stream. A man named "xX_Kevin_Xx" from your basement days is now your head of security.',
      'Mom visits. She is proud. She still asks when you\'ll get a real job.',
      'This is it. Become the LAN LORD.',
    ],
  },
];

// ================================================================ PRESTIGE: Clout perks
export interface PerkDef { id: string; name: string; icon: string; desc: string; max: number; cost: (lvl: number) => number; }
export const PERKS: PerkDef[] = [
  { id: 'cred', name: 'Street Cred', icon: '😎', desc: '+10% to what gamers are willing to pay, per level.', max: 5, cost: l => 8 + l * 8 },
  { id: 'fund', name: 'Trust Fund (Grandma)', icon: '👵', desc: '+$1,500 starting cash at every location, per level.', max: 5, cost: l => 6 + l * 6 },
  { id: 'bulk', name: 'Bulk Discount', icon: '🏷️', desc: '-8% cost on everything you build, per level.', max: 4, cost: l => 10 + l * 10 },
  { id: 'mouth', name: 'Word of Mouth', icon: '📣', desc: '+12% more customers walk in, per level.', max: 5, cost: l => 8 + l * 9 },
  { id: 'bladder', name: 'Iron Bladder Policy', icon: '🚽', desc: 'Customers need the toilet 20% less often, per level.', max: 2, cost: l => 10 + l * 15 },
  { id: 'insurance', name: 'Fire Insurance', icon: '🧯', desc: 'Half as many fires. Extinguishing is free.', max: 1, cost: () => 20 },
  { id: 'savant', name: 'Tech Savant', icon: '🤓', desc: 'Keep all Windows Updates (research) when you move.', max: 1, cost: () => 30 },
  { id: 'blessing', name: "Mom's Blessing", icon: '👩', desc: 'Moms no longer drag kids out. (She finally approves.)', max: 1, cost: () => 15 },
];
export interface Profile { name: string; shop: string; rival: string; sex: 'm' | 'f'; look: any; starter: 'beige' | 'gateway' | 'emachine'; degen: string; fav: 'halo' | 'wow' | 'cs' | 'rs' | 'ddr'; away: string; }
// ---- community build config
export const GAME_VERSION = '0.9.0-community';
export const REPO_SLUG = 'lanlordxp/lanlordxp.github.io';
export const REPO_URL = 'https://github.com/' + REPO_SLUG;
export const PLAY_URL = 'https://lanlordxp.github.io/';
export const CLAN_TAGS = ['[PWN]', 'xXx', '{LAN}', '-=SoD=-', '[NOOB]', '[BAWLZ]', '~TFC~', '[1337]'];
export const OWNER_LINES = ['business is BOOMING', 'I should hire someone. I am someone.', 'is that a new stain?', 'this is fine', 'mom would be so proud. or concerned', 'remember: the customer is always lagging', 'I have not slept since Tuesday', 'one day... the TOWER', 'who ordered 40 Hot Pockets? oh. me.', 'I am the LAN LORD', 'gg ez', 'I could get a real job. but why'];
export interface Meta { profile?: Profile; tutorialDone?: boolean; downloads?: any[]; clout: number; totalClout: number; perks: Record<string, number>; loc: number; runs: number; research: Record<string, boolean>; lifetime: { served: number; earned: number; fires: number; deaths: number; }; }
export function newMeta(): Meta { return { clout: 0, totalClout: 0, perks: {}, loc: 0, runs: 1, research: {}, lifetime: { served: 0, earned: 0, fires: 0, deaths: 0 } }; }
export const MOM_LAUNDRY = ['WHO LEFT PIZZA IN THE DRYER', 'TURN THAT DOWN!!!', 'is this a "LAN" or a "fire hazard"', 'your father would be... somewhere', 'dinner is at 6. bring your friends. they look hungry', 'I\'m just doing laundry, ignore me', 'is that the boy who threw up on the stairs?'];
