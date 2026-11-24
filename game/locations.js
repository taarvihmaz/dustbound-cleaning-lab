/* The location book is the shared source for the map, collision rules and artwork.
 * Each line describes one place. A..Y are cells of its hand-authored 5×5 plan:
 * A B C D E / F G H I J / K L M N O / P Q R S T / U V W X Y.
 * Each set of letters belongs to a named fixture. Bigger boards extend the plan
 * into wings separated by walkways. They keep its characteristic arrangements.
 */
(function (root) {
  "use strict";
  const environments = {
    stacks: ["interior",1,"deck","city","dust","cabin","b8d1c4 a5b59d 596f66 c59b68 293e3f fce8bd"],
    salon: ["interior",1,"tile","city","dust","arch","9fc8c9 c39e87 995f50 dfb888 45333d ffebc0"],
    glass: ["interior",1,"tile","hills","spores","arch","a9d6c8 93bb9e 387767 acc89c 244e4b fbf2bc"],
    shop: ["urban",1,"brick","city","dust","station","b2cbd0 cea888 9e6c52 e2bd91 473b39 ffe6b8"],
    street: ["urban",0,"stone","city","rain","tower","96bccd 91a9ae 576c78 c9b9a4 293f4e ffe0a1"],
    plaza: ["urban",0,"tile","city","leaves","arch","a5d3cf 8dbdab 587e70 d9c59c 304d46 f9e2ac"],
    rail: ["industrial",0,"iron","city","ash","gantry","adc6c2 b9ab8b 8d735c b8a48a 3b403d ffda96"],
    works: ["industrial",1,"iron","city","ash","gantry","9fbfbd 9aac9f 587a75 c0aa8d 2e4850 ffda9c"],
    foundry: ["industrial",1,"brick","spires","ash","kiln","b7c5b8 c29d84 9d6455 c59c7b 483747 ffc786"],
    arena: ["urban",1,"tile","city","dust","arch","a6d2cd 8fb5a7 437f76 c6c78a 264e4d f7de8c"],
    farm: ["woodland",0,"grass","hills","leaves","windmill","b1d9ca b7ca89 67916a c4c988 3d5b43 ffe4a3"],
    forest: ["woodland",0,"moss","forest","leaves","cabin","b9d9c2 8fbe99 417d68 9ebc84 294c43 e9edb9"],
    alpine: ["mountain",0,"slate","peaks","dust","station","91c8d6 94aec9 627fa0 b5b5a4 354457 fce6c5"],
    ice: ["mountain",0,"ice","ice","snow","station","89d2dc 90c1d0 6085a2 c1dfda 2f5368 f9eab9"],
    dune: ["desert",0,"sand","dunes","dust","station","a4cbd0 e5bb8f c68960 e5bd81 62403d ffe4ac"],
    canyon: ["desert",0,"stone","mesa","dust","arch","99c5c4 d6ad87 b67458 dcb083 633f40 fce2ac"],
    shore: ["coast",0,"shell","coast","foam","lighthouse","8dd1d0 81b9b9 548f98 e1cda9 395758 f8e5bd"],
    pier: ["coast",0,"deck","coast","foam","gantry","88c4cb 8ab7bc 507e87 c6a17e 344b50 ffdfa7"],
    wetland: ["water",0,"mud","marsh","fireflies","cabin","acd1bb 8fb98e 538974 b2bc88 36574a f3e3a7"],
    canal: ["water",0,"stone","coast","rain","arch","93c6c6 8cb7b4 5c8991 c1bda1 344f55 f7dfae"],
    cave: ["mountain",1,"slate","spires","spores","arch","adb8d0 9295af 6d6489 b2a1b1 363747 e9d4bb"],
    stage: ["interior",1,"deck","city","stars","dome","c0bbc6 a395a9 795e81 c3a081 413447 f5d5aa"],
    lab: ["interior",1,"tile","hills","dust","dome","a4d6d1 94bcb1 598c91 becabb 36565c f1ebbc"],
  };

  // Name | environment | route feature | three fixtures and their actual cells.
  const book = `
Lantern Library|stacks|Reading bays|shelf Book stacks@AFK|lamp Reading lamps@IS|table Folio desk@W
Tidal Crab Hatchery|shore|Nursery pools|tank Hatchling tanks@BD|basket Shell baskets@MP|pump Seawater intake@X
Corner Coffeehouse|salon|Counter aisle|table Café tables@GS|counter Espresso bar@BC|chair Bentwood chairs@P
Quartz Minehead|cave|Shaft approach|cart Ore tubs@BL|crystal Quartz outcrop@OY|gantry Lift frame@Q
Paper Mill Drying Loft|works|Drying lanes|rack Paper screens@BGQ|roll Paper reels@EO|vat Pulp tub@S
Antenna Relay Ridge|alpine|Relay terraces|dish Receiver dishes@FM|tower Radio mast@D|case Tool cases@OX
Aircraft Workshop|works|Wing clearance|plane Airframe@GH|bench Riveting bench@O|cart Tool trolley@UX
Wisteria Pergola|forest|Arched garden walk|arch Vine trellises@FH|pot Wisteria tubs@OT|bench Garden seat@W
Glassblower's Kiln|foundry|Annealing lane|kiln Glass furnace@FG|bottle Glass stock@DN|rack Cooling rack@X
Sunken Bell Dock|pier|Salvage slips|bell Bronze bell@M|winch Salvage winches@BP|boat Diver launch@TY
School Assembly Hall|stacks|Classroom corridor|locker Locker bank@AEJ|bench Hall benches@LU|sign Noticeboard@S
Polar Weather Station|ice|Instrument court|sensor Weather mast@BH|dish Telemetry dish@OT|tent Instrument hut@V
Puppet Makers' Attic|stage|Marionette aisles|puppet String puppets@EG|chest Costume trunks@KL|rack Backdrop rail@X
Saffron Spice Bazaar|dune|Awning passages|stall Spice stalls@AF|jar Spice jars@NS|basket Pepper baskets@U
Leadenhall Market|street|Covered arcade|stall Market canopies@AG|column Arcade columns@EJT|crate Produce cases@Q
Volcanic Observatory|canyon|Crater stations|scope Survey telescope@L|rock Lava blocks@BI|antenna Telemetry aerial@WY
Violin Repair Room|stacks|Luthier benches|violin Instrument stands@BN|bench Carving bench@KP|case Fiddle cases@X
Night Ferry Terminal|pier|Boarding lanes|boat Ferry tender@CD|gate Boarding turnstiles@FL|seat Waiting seats@Y
Hall of Mammals|salon|Specimen galleries|animal Mounted specimens@GIM|case Display cases@PT|column Gallery pier@A
Almond Harvest Terrace|farm|Orchard terraces|tree Almond trees@ABR|ladder Picking ladder@J|basket Harvest baskets@U
Meteorite Repository|lab|Stone galleries|rock Meteorites@ILP|plinth Sample stands@C|cabinet Sample cabinet@TY
Old Canal Locks|canal|Lock gates|gate Lock gates@FK|wheel Gate wheels@DI|bollard Mooring posts@RW
Indoor Climbing Gym|arena|Bouldering bays|climb Bouldering walls@ACE|mat Crash mats@NQ|ladder Rope ladder@U
Signalman's Signal Box|rail|Lever banks|lever Signal levers@BCL|signal Semaphore@O|desk Diagram desk@V
Fern Spore Nursery|glass|Propagation beds|fern Tree ferns@FLN|tray Seed flats@A|tank Misting tank@Y
Snowcat Garage|ice|Vehicle bays|tractor Snowcat@GI|drum Fuel drums@CU|rack Track parts@T
Freight Station|rail|Loading sidings|crate Freight crates@AHL|cart Platform trolleys@EX|signal Rail signal@P
Mosaic Bathhouse|salon|Bath galleries|pool Tiled baths@BI|column Marble columns@KM|chair Bath stools@Y
Hilltop Letterpress|shop|Printing lanes|press Printing press@BK|tray Type trays@NX|roll Ink rollers@E
Cliff Lift Landing|alpine|Cable landing|gondola Cable cars@BH|winch Lift winding drum@KV|gate Lift barrier@J
Painter's Studio|salon|Easel court|easel Studio easels@BGI|table Mixing table@Q|canvas Stretched canvases@Y
Willow Canoe Landing|wetland|Launch channels|canoe Dugout canoes@FN|reed Willow reeds@CD|bollard Landing post@X
Phonograph Archive|stacks|Listening booths|horn Listening horns@GI|cabinet Record cabinet@EF|seat Listening stool@U
Copper Kettle Brewery|works|Fermentation aisle|vat Copper kettles@HL|drum Fermentation barrels@RT|pipe Cooling line@A
Neighbourhood Cinema|stage|Screening rows|seat Cinema seats@BGRS|screen Projection screen@D|lamp Aisle lamp@P
Limestone Fossil Cut|canyon|Excavation benches|fossil Fossil slab@FJ|rock Cut limestone@MXY|ladder Trench ladder@A
Silk Weavers' Gallery|stacks|Loom passages|loom Jacquard looms@AHS|roll Silk spools@KV|basket Yarn baskets@E
Storm Buoy Yard|pier|Buoy storage|buoy Storm buoys@AFO|winch Chain winch@N|crate Spare lights@W
Penguin Museum|salon|Colony exhibits|penguin Penguin exhibits@BMQ|case Diorama case@E|bench Visitor bench@TU
Mountain Rescue Hut|alpine|Rescue staging|stretcher Rescue sled@CH|tent Canvas shelter@K|case Medical cases@SY
Clay Pipe Works|foundry|Pipe racks|pipe Clay pipes@AHI|kiln Pipe kiln@S|cart Kiln cart@UX
Sunflower Seed Farm|farm|Drying rows|flower Sunflowers@BKS|hopper Seed hopper@H|basket Seed baskets@T
Iron Foundry|foundry|Casting floor|kiln Casting furnace@GN|ladle Foundry ladle@BU|anvil Finishing anvil@Y
Mirror Lake Boathouse|canal|Boat berths|canoe Racing shells@HLT|rack Oar rack@B|buoy Life buoys@V
Watchmakers' Gallery|shop|Work stations|clock Regulator clocks@AIY|desk Jeweller desk@F|cabinet Parts cabinet@R
Icebreaker Mooring|ice|Mooring fingers|bollard Shipside bollards@BKT|winch Tow winch@Y|ice Pack ice@X
University Quadrangle|plaza|Campus crosswalks|bench Campus benches@AGR|tree Courtyard tree@E|sign Campus directory@Y
Cave Pearl Chamber|cave|Dripstone passages|crystal Cave pearls@CQS|rock Dripstones@F|pool Rimstone pool@J
Waterwheel Flour Mill|canal|Millrace walk|wheel Mill wheel@FKL|hopper Grain hopper@D|sack Flour sacks@Y
Dovecote Court|farm|Birdhouse court|birdhouse Dovecotes@BMO|basket Feed baskets@H|post Roosting post@V
Timber Hayloft|stacks|Bale passages|bale Hay bales@BAN|ladder Loft ladder@E|fork Hay fork@X
Pumpkin Lantern Patch|farm|Picking rows|pumpkin Pumpkins@CHL|cart Harvest cart@V|post Field signs@Y
Granite Sculpture Court|plaza|Sculpture walk|statue Stone figures@BJQ|plinth Plinths@H|bench Viewing bench@U
Salt Pan Evaporator|dune|Brine terraces|pool Brine basins@FGS|pump Brine pump@D|sack Salt sacks@X
Shanghai Riverside|canal|Promenade bends|rail River railings@ACJ|lamp Promenade lamps@MR|bench River bench@U
Flax Dye Garden|forest|Vat courtyards|vat Dye vats@GIO|flower Flax beds@A|rack Drying rail@W
Typewriter Exchange|shop|Repair counters|typewriter Typewriters@BLS|counter Service counters@D|chair Typing stools@V
Sun Dial Plaza|plaza|Shadow lines|sundial Bronze sundials@EN|column Marker pillars@BP|tree Plane tree@W
Hall of Mirrors|salon|Reflecting galleries|mirror Mirror panels@BHN|column Gilt pilasters@P|chandelier Floor candelabra@Y
Cable Spool Depot|rail|Drum alleys|roll Cable reels@ACH|gantry Hoisting gantry@V|case Insulators@T
Hivekeeper's Clearing|forest|Apiary lanes|hive Beehives@GNT|drum Honey drums@A|flower Wildflowers@S
Mudflat Bird Blind|wetland|Reed hides|hut Observation blind@GL|reed Reed stands@DO|scope Spotting scope@U
Log Cabin|stacks|Hearth passage|stove Wood stove@AM|bed Cabin bunk@CJ|chest Blanket chest@W
Moon Rock Lab|lab|Clean benches|glovebox Sample gloveboxes@CI|rock Lunar samples@F|cabinet Sealed cabinet@UY
Automaton Toy Shop|shop|Display islands|toy Winding toys@HKN|shelf Toy shelves@A|counter Repair counter@Y
Coral Survey Pier|shore|Sampling slips|coral Coral samples@BIQ|tank Specimen tanks@A|canoe Survey canoe@Y
Red Church|salon|Nave and pews|pew Timber pews@GIRS|altar Altar@B|organ Pipe organ@A
Sequoia Fire Lookout|forest|Lookout perimeter|tower Lookout tower@G|stump Tree stumps@DNQ|tank Water cistern@U
Botanical Print House|glass|Specimen tables|press Specimen press@FH|fern Frond displays@D|rack Paper screens@S
Ice Core Freezer|lab|Sample racks|rack Core racks@BNO|ice Ice cores@GL|chest Cold storage@U
Billiards Hall|arena|Table islands|billiards Billiard tables@GJS|rack Cue racks@A|lamp Shaded lamp@W
Silt Sampling Jetty|wetland|Core stations|tripod Core tripods@BS|boat Sampling skiff@AN|case Sample crates@X
Clock Tower Belfry|stacks|Bell aisles|bell Tower bells@BHM|gear Clock gears@T|ladder Access ladder@U
Hot Air Balloon Field|farm|Launch pads|balloon Hot air balloons@BN|basket Gondola baskets@KS|sack Ballast sacks@Y
Fish Hoek Beach|shore|Tidal strand|umbrella Beach umbrellas@GOS|rock Shore boulders@B|boat Fishing dinghy@U
Lavender Distillery|farm|Still houses|still Copper stills@BKL|flower Lavender beds@DI|drum Oil drums@X
Lighthouse Lantern Room|pier|Optics gallery|lens Fresnel lens@M|lamp Backup lanterns@DS|rail Guardrail@U
Mossy Tipi Camp|forest|Tent circle|tent Cone tents@BKO|fire Camp hearth@M|log Firewood@Y
Dance Hall|stage|Ballroom perimeter|mirror Dance mirrors@AF|rail Practice barres@CJ|piano Rehearsal piano@X
Granary Loading Ramp|rail|Loading terraces|sack Grain sacks@BGJ|cart Sack trucks@R|hopper Chute mouth@U
Porcelain Tea Shop|shop|Tea displays|teapot Ceramic teapots@BN|shelf Teacup shelves@KT|table Tasting table@E
Rooftop Telescope Array|street|Observing pads|scope Optical telescopes@BIM|dish Radio receivers@V|case Tracking computer@T
Chinese Garden|forest|Pavilion walk|pagoda Garden pavilion@G|rock Scholar stones@BLO|bridge Moon bridge@X
Glacial Moraine Field|ice|Moraine channels|ice Ice pinnacles@FHI|rock Glacial erratics@SY|post Survey stakes@A
Bread Oven Court|shop|Baking bays|oven Bread ovens@ANR|rack Cooling racks@B|sack Flour bags@Y
Aquarium Quarantine Room|lab|Tank islands|tank Fish tanks@BHL|pump Filter pumps@O|pipe Oxygen lines@X
Parking Garage|works|Parking bays|car Parked cars@BGNS|column Concrete columns@E|gate Barrier arm@U
Woodcut Workshop|stacks|Carving stations|bench Woodcut benches@AHQ|press Proofing press@E|tray Ink trays@T
Maple Syrup Camp|forest|Sap collection|tree Tapped maples@BGN|bucket Sap buckets@CJ|kiln Sugar furnace@V
Cobblestone Tram Loop|street|Track loop|tram Tramcar@HI|signal Tram signal@B|seat Stop bench@SY
Open-Air Theatre|plaza|Stone amphitheatre|seat Stone seats@BGIN|stage Platform@M|column Stage pillar@Y
Seagrass Research Raft|shore|Floating walkways|raft Research pontoon@AL|reed Seagrass trays@BI|tank Seawater tank@Y
Printing Ink Warehouse|works|Vat lanes|drum Ink barrels@BHS|roll Paper rolls@N|crate Pigment boxes@U
Observatory Dome Hall|lab|Instrument rotunda|dome Telescope dome@M|scope Portable telescope@DT|desk Star charts@A
Old Brick Factory|foundry|Kiln tracks|brick Brick stacks@FGIS|kiln Firing kiln@D|cart Brick trolley@V
Blueberry Picking Shed|farm|Packing benches|basket Berry baskets@BIQ|rack Grading racks@D|stall Produce stand@W
Textile Conservatory|salon|Textile screens|loom Tapestry frames@BLK|roll Fabric rolls@D|chest Linen chest@SY
Cliffside Rope Bridge|alpine|Bridgeheads|bridge Rope spans@HN|post Anchor posts@BU|rock Granite edge@E
Hotel Roof Balcony|plaza|Terrace seating|chair Terrace chairs@GNR|table Patio tables@B|pot Balcony planters@T
Salt Marsh Windpump|wetland|Drainage banks|windmill Windpump@H|reed Rush stands@FNT|gate Sluice gate@U
Chocolate Factory|foundry|Conching lanes|mixer Chocolate mixer@GOS|tray Mould trays@B|sack Cocoa sacks@V
Mushroom Grotto|cave|Fungus clusters|mushroom Shelf fungi@BIM|rock Cave pillars@V|basket Spore baskets@Y
Squash Court|arena|Service boxes|screen Front wall@BCD|rack Racket rack@N|seat Players bench@U
Lakeside Rowing Club|canal|Shell storage|canoe Rowing shells@GNS|rack Scull rack@B|mat Launch mat@E
Railway Signal Nursery|rail|Test tracks|signal Test semaphores@BKM|lever Signal lever@O|post Track marker@X
Jade Carving Yard|canyon|Saw lanes|crystal Jade blocks@HNS|wheel Grinding wheels@A|bench Cutting bench@U
Municipal Pump Station|works|Pump gallery|pump Water pumps@BHS|pipe Pressure mains@AO|wheel Isolation valve@U
Herbarium Cabinet Hall|stacks|Cabinet galleries|cabinet Specimen cabinets@BEJ|tray Plant presses@LN|fern Dry fronds@W
Tin Can Cannery|works|Seaming line|press Can seamers@FHN|belt Sorting belt@D|crate Tin cases@W
Orchid Palm House|glass|Glasshouse beds|flower Orchid clusters@AFL|tree Fan palms@E|pool Mist pool@Y
Ethnography Museum|salon|Object galleries|case Artefact vitrines@FGI|pot Earthenware pots@D|loom Historic loom@Y
Marble Quarry|alpine|Cutting terraces|block Marble blocks@BGIO|winch Quarry pulley@X|cart Stone cart@A
Mangrove Kayak Passage|wetland|Root channels|tree Mangrove roots@BNS|canoe Kayaks@A|buoy Channel buoys@W
Seed Bank Vault|lab|Cold aisles|cabinet Seed lockers@FGN|chest Cold chests@D|tray Sample flats@Y
Netball Court|plaza|Goal circles|hoop Netball goals@AU|seat Sideline benches@CJ|cart Ball cart@Y
Wine Cellar Vaults|cave|Barrel aisles|drum Wine casks@AFN|rack Bottle racks@E|table Tasting stand@W
Fireboat Slipway|pier|Launch rails|boat Rescue launch@FG|hose Fire hoses@NO|winch Launch winch@V
Costume Dressing Room|stage|Dressing bays|rack Costume rails@BHL|mirror Dressing mirrors@E|chair Vanity chairs@U
City Service Rooftop|street|Service walkways|vent Air handlers@GNS|antenna Aerial mast@B|pipe Roof vents@V
Stone Circle Clearing|forest|Megalith ring|stone Standing stones@BDOS|fire Fire circle@M|post Trail marker@V
Moorland Peat Cutting|wetland|Peat banks|brick Peat blocks@FGT|fork Cutting spades@B|cart Peat trolley@A
Fencing Salle|arena|Practice pistes|mat Fencing strips@BNR|rack Foil rack@A|seat Judges bench@E
Wood-Panelled Lounge|salon|Fireside groups|sofa Lounge sofas@GN|table Low tables@BC|lamp Floor lamps@Y
Crate Crane Terminal|rail|Crane spans|gantry Cargo cranes@BKO|crate Freight containers@HM|bollard Crane stops@Y
Reindeer Feeding Enclosure|ice|Feeding pens|animal Reindeer@EM|fence Pen fences@BGL|bale Fodder bales@Y
Sandstone Caravanserai|dune|Caravan courtyard|arch Entry arch@B|stall Caravan stalls@FKA|jar Water jars@X
Aircraft Hangar|works|Apron clearances|plane Parked aircraft@GNS|ladder Service steps@D|drum Hydraulic drums@U
Copperplate Etching Room|shop|Etching tables|tray Etching baths@BJM|press Plate press@A|rack Plate storage@Y
Film Reel Archive|stacks|Canister aisles|roll Film reels@GIN|cabinet Film cabinets@B|cart Reel trolley@U
Turtle Nesting Beach|shore|Nest enclosures|nest Turtle nests@AMS|fence Nest guards@F|sign Nest signs@X
Factory Canteen|works|Dining rows|table Canteen tables@FHNS|counter Serving line@A|tray Meal tray stacks@Y
Juniper Cider Press|farm|Cider presses|press Cider presses@GL|drum Cider casks@DN|basket Fruit baskets@U
Grand Piano Store|salon|Instrument islands|piano Grand pianos@BNT|seat Piano benches@G|case Sheet music case@S
Disused Mine Railway|cave|Ore sidings|cart Mine carts@ANR|rock Shaft rubble@BG|gantry Tunnel frame@E
Concert Music Hall|stage|Orchestra platform|piano Concert grand@G|seat Orchestra seats@BINS|stand Music stands@Y
Beacon Dune Outpost|dune|Beacon perimeter|tower Sand beacon@M|tent Survey tents@BS|rock Dune boulders@U
Bird Ringing Station|forest|Banding stations|net Mist nets@BHO|table Banding bench@Q|birdhouse Release boxes@Y
Watercolour Reed Bed|wetland|Reed peninsulas|reed Reed islands@GMS|easel Field easel@B|boat Flat-bottomed punt@U
Frozen River Bend|ice|Ice-bank bends|ice Shore ice@BAN|log Driftwood@EY|rock Bank boulder@Q
Meteor Tracking Outpost|dune|Tracking stations|dish Radar dishes@GIS|antenna Signal antenna@C|case Sensor case@U
Shadow Lantern Theatre|stage|Screen wings|screen Shadow screens@FH|lamp Lantern stands@NO|puppet Shadow puppets@X
Vinegar Maker's Yard|farm|Cask terraces|drum Vinegar casks@BKS|jar Earthen jars@H|counter Filling bench@Y
Air Museum Playground|plaza|Exhibit islands|plane Display aircraft@AHN|climb Climbing frame@T|seat Picnic bench@W
Rock Pool Laboratory|shore|Tidal basins|pool Rock pools@GNS|tripod Sampling tripods@B|case Dive gear@Y
Gypsum Crystal Tunnels|cave|Crystal galleries|crystal Selenite clusters@BCN|rock Gypsum columns@A|lamp Mine lamps@Y
Steam Laundry|works|Washing aisle|vat Laundry boilers@BJS|roll Mangle rollers@G|basket Linen hampers@W
Small Repair Workshop|works|Workbench lanes|bench Repair benches@FGS|vice Bench vises@D|chest Parts drawers@Y
Lowland Rice Paddies|wetland|Paddy terraces|reed Rice beds@BKL|pump Water pump@E|sack Grain sacks@T
Rosemary Courtyard|plaza|Herb beds|pot Rosemary pots@BDQ|bench Stone bench@M|well Old well@Y
Hot Spring Lodge|alpine|Spring terraces|pool Spring pools@FGN|rock Mineral mounds@D|hut Bath hut@S
Zavelstein Castle Cellar|cave|Vaulted cellar|arch Cellar vaults@AD|drum Wine casks@KR|chest Storage chests@Y
Wind Harp Plateau|alpine|Wind passages|harp Wind harps@BI|stone Upright slabs@KS|post Wind vane@T
Bookbinders' Court|shop|Bindery stations|press Binding presses@GIO|rack Paper racks@A|roll Linen rolls@X
Eider Down Depot|pier|Packing bays|sack Feather sacks@AN|crate Export cases@FH|scale Weighing scale@U
Borghese Gardens|forest|Garden avenues|statue Garden statues@BGN|tree Stone pines@EI|bench Park bench@U
Glass Tide Observatory|shore|Observation arms|dome Glass viewing dome@M|coral Reef markers@GN|scope Coastal telescope@Y
Desert Sundowner Airstrip|dune|Runway margins|windsock Windsocks@BU|plane Bush plane@J|drum Fuel drums@Q
Cavern Echo Chamber|cave|Listening chambers|horn Acoustic trumpets@FHS|rock Basalt piers@A|sensor Microphone stand@Y
`.trim();

  const styles = ["Storybook", "Pixel art", "Painted diorama", "Cut paper"];
  // A small variation in the light ties each venue's sky, timber and floor together.
  function litPalette(palette, id) {
    const tints = [[255,212,140],[142,217,207],[205,177,221],[255,184,146],[194,219,152]];
    const tint = tints[(id * 13 + Math.floor(id / 4)) % tints.length];
    const amount = .04 + (id % 7) * .012;
    return Object.freeze(palette.split(" ").map((hex, index) => {
      const weight = index === 4 ? amount / 3 : amount;
      return "#" + [0,1,2].map(channel => {
        const value = parseInt(hex.slice(channel*2,channel*2+2),16);
        return Math.round(value * (1-weight) + tint[channel] * weight).toString(16).padStart(2,"0");
      }).join("");
    }));
  }

  const designs = book.split("\n").map((line, id) => {
    const [name, category, layoutName, ...items] = line.split("|");
    const [region, indoors, surface, horizon, air, landmark, palette] = environments[category];
    const mode = id % styles.length;
    const floor = Array(25).fill(".");
    const fixtures = items.map((item, slot) => {
      const [label, positions] = item.split("@");
      const split = label.indexOf(" ");
      for (const letter of positions) floor[letter.charCodeAt(0) - 65] = String(slot + 1);
      return Object.freeze({kind: label.slice(0, split), name: label.slice(split + 1)});
    });
    const plan = Array.from({length: 5}, (_, row) => floor.slice(5 * row, 5 * row + 5).join(""));
    return Object.freeze({
      id, name, biome: name, category, layoutName, mode, style: styles[mode], indoors: !!indoors,
      region,
      surface, horizon, air, landmark, obstacle: fixtures[0].kind,
      colors: litPalette(palette, id),
      fixtures: Object.freeze(fixtures), fixtureLabels: Object.freeze(fixtures.map(item => item.name)),
      plan: Object.freeze(plan)
    });
  });

  // Each large-map wing is a faithful enlargement of the original blueprint.
  // Adjacent wings meet at an open passage. Local shape tests carve into
  // solid fixture blocks; every carved edge connects to its surrounding aisle.
  function fixtureSlot(design, cell, size) {
    const x = cell % size, y = Math.floor(cell / size);
    if (size === 5) return Number(design.plan[y][x]) || 0;
    const period = size <= 20 ? size : (size === 50 ? 13 : 17);
    const wingX = Math.floor(x / period), wingY = Math.floor(y / period);
    const width = Math.min(period, size - wingX * period);
    const height = Math.min(period, size - wingY * period);
    let localX = x % period, localY = y % period;
    if (localX === 0 || localY === 0 || localX === width-1 || localY === height-1) return 0;
    if (wingX % 2) localX = width - 1 - localX;
    if (wingY % 2) localY = height - 1 - localY;
    const column = Math.floor(5 * localX / width);
    const row = Math.floor(5 * localY / height);
    const slot = Number(design.plan[row][column]) || 0;
    if (!slot || width < 12 || height < 12) return slot;
    const left = Math.ceil(column * width / 5), top = Math.ceil(row * height / 5);
    const right = Math.ceil((column + 1) * width / 5) - 1, bottom = Math.ceil((row + 1) * height / 5) - 1;
    // Passages around each cluster keep enlarged rooms and service yards traversable.
    if (localX === left || localY === top) return 0;
    const kind = design.fixtures[slot - 1].kind;
    if (linear.has(kind) && localY === bottom && bottom-top>=3) return 0;
    if (round.has(kind) && right-left>=3 && bottom-top>=3 && localX===right && localY===bottom) return 0;
    return slot;
  }

  const linear = new Set(["shelf","rack","counter","rail","fence","pew","bench","ladder","canoe","screen","desk","loom","pipe","belt","bridge"]);
  const round = new Set(["rock","tree","vat","pot","well","crystal","flower","drum","pool","hive","dish","pumpkin","mushroom","stone","ice","balloon"]);
  function makeMap(size, designId) {
    const place = designs[designId];
    if (!place || !Number.isInteger(size) || size < 5) throw new RangeError("Invalid location or board size");
    return Uint8Array.from({length: size * size}, (_, cell) => Number(fixtureSlot(place, cell, size) > 0));
  }
  function fixtureAt(designId, cell, size) {
    if (!Number.isInteger(cell) || cell < 0 || cell >= size * size) return null;
    return designs[designId].fixtures[fixtureSlot(designs[designId], cell, size) - 1] || null;
  }

  const locations = Object.freeze({designs: Object.freeze(designs), makeMap, fixtureAt});
  root.Locations = locations;
  if (typeof module === "object" && module.exports) module.exports = locations;
})(globalThis);
