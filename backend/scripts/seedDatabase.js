const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Listing = require('../models/list.js');
const User = require('../models/user.js');

const dbUrl = process.argv[2] || process.env.ATLAS_URI || 'mongodb://127.0.0.1:27017/wunderlust';

const sampleListingsData = [
  // ==============================================================================
  // 1. TRENDING (4 Properties)
  // ==============================================================================
  {
    title: "Candolim Beachfront Luxury Villa",
    description: "Step directly onto the golden sands of Candolim beach. Enjoy stunning Arabian Sea sunsets, private infinity pool, open-air coastal living, and a dedicated chef on call.",
    image: {
      filename: "listing_candolim_villa",
      url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
    },
    price: 9500,
    location: "Candolim, Goa",
    country: "India",
    category: "Trending",
    geometry: { type: "Point", coordinates: [73.7667, 15.5167] },
    maxGuests: 8,
    amenities: ["WiFi", "Pool", "Air conditioning", "Kitchen", "Free parking", "Dedicated workspace", "BBQ grill", "Balcony"],
    averageRating: 4.95,
    reviewsCount: 42
  },
  {
    title: "Ubud Tropical Bamboo Eco-Haven",
    description: "Architectural masterpiece crafted entirely from sustainably harvested bamboo. Features open-air jungle suites, a private valley infinity pool, and sunrise views over Mount Agung.",
    image: {
      filename: "listing_ubud_haven",
      url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80"
    },
    price: 8200,
    location: "Ubud, Bali",
    country: "Indonesia",
    category: "Trending",
    geometry: { type: "Point", coordinates: [115.2625, -8.5069] },
    maxGuests: 6,
    amenities: ["WiFi", "Pool", "Air conditioning", "Kitchen", "Free parking", "Breakfast included", "Hot tub"],
    averageRating: 4.98,
    reviewsCount: 68
  },
  {
    title: "Santorini Sunset Cliffside Cave Suite",
    description: "Perched high on the Oia caldera cliffs with dramatic Aegean Sea vistas. Features private volcanic stone plunge pool, whitewashed Cycladic arches, and Champagne sunset deck.",
    image: {
      filename: "listing_santorini_suite",
      url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80"
    },
    price: 18500,
    location: "Oia, Santorini",
    country: "Greece",
    category: "Trending",
    geometry: { type: "Point", coordinates: [25.3753, 36.4618] },
    maxGuests: 3,
    amenities: ["WiFi", "Pool", "Air conditioning", "Hot tub", "Balcony", "Free parking", "Dedicated workspace"],
    averageRating: 4.96,
    reviewsCount: 54
  },
  {
    title: "Amalfi Coast Clifftop Panoramic Estate",
    description: "Historic Italian villa overlooking turquoise Mediterranean waters and cascading pastel houses of Positano. Private citrus grove, marble terrace, and private water taxi access.",
    image: {
      filename: "listing_amalfi_estate",
      url: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80"
    },
    price: 22000,
    location: "Positano, Amalfi Coast",
    country: "Italy",
    category: "Trending",
    geometry: { type: "Point", coordinates: [14.4850, 40.6281] },
    maxGuests: 6,
    amenities: ["WiFi", "Air conditioning", "Kitchen", "Balcony", "Free parking", "Wine cellar", "Dedicated workspace"],
    averageRating: 4.93,
    reviewsCount: 39
  },

  // ==============================================================================
  // 2. ROOMS (4 Properties)
  // ==============================================================================
  {
    title: "Montmartre Bohemian Artist Studio Room",
    description: "Charming sunlit private room with original wooden beams, skylight windows overlooking Parisian rooftops, and vintage book collection just steps from Sacré-Cœur.",
    image: {
      filename: "listing_montmartre_room",
      url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"
    },
    price: 4500,
    location: "Montmartre, Paris",
    country: "France",
    category: "Room",
    geometry: { type: "Point", coordinates: [2.3431, 48.8867] },
    maxGuests: 2,
    amenities: ["WiFi", "Dedicated workspace", "Kitchen", "Heating", "Washer"],
    averageRating: 4.88,
    reviewsCount: 31
  },
  {
    title: "Kyoto Traditional Cedar Machiya Room",
    description: "Peaceful tatami room in a 120-year-old preserved cedar townhouse. Overlooks a mossy Zen rock garden with shoji paper screens, green tea service, and hinoki cypress bath.",
    image: {
      filename: "listing_kyoto_room",
      url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80"
    },
    price: 5200,
    location: "Gion, Kyoto",
    country: "Japan",
    category: "Room",
    geometry: { type: "Point", coordinates: [135.7681, 35.0116] },
    maxGuests: 2,
    amenities: ["WiFi", "Air conditioning", "Heating", "Garden view", "Tea station"],
    averageRating: 4.97,
    reviewsCount: 76
  },
  {
    title: "SoHo Minimalist Designer Loft Room",
    description: "Industrial chic bedroom in the heart of SoHo. High 14-foot ceilings, exposed cast iron pillars, oversized windows, and bespoke contemporary furniture.",
    image: {
      filename: "listing_soho_room",
      url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
    },
    price: 6800,
    location: "SoHo, New York",
    country: "United States",
    category: "Room",
    geometry: { type: "Point", coordinates: [-74.0000, 40.7233] },
    maxGuests: 2,
    amenities: ["WiFi", "Air conditioning", "Elevator", "Dedicated workspace", "Gym access"],
    averageRating: 4.89,
    reviewsCount: 45
  },
  {
    title: "Trastevere Historic Courtyard Garden Room",
    description: "Romantic room in a 17th-century Roman palazzo with ivy-covered terrace, terracotta tile floors, and authentic trattorias right around the cobblestone corner.",
    image: {
      filename: "listing_trastevere_room",
      url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80"
    },
    price: 4800,
    location: "Trastevere, Rome",
    country: "Italy",
    category: "Room",
    geometry: { type: "Point", coordinates: [12.4692, 41.8885] },
    maxGuests: 2,
    amenities: ["WiFi", "Air conditioning", "Courtyard garden", "Coffee maker", "Balcony"],
    averageRating: 4.91,
    reviewsCount: 28
  },

  // ==============================================================================
  // 3. ICONIC CITIES (4 Properties)
  // ==============================================================================
  {
    title: "Royal Heritage Courtyard Suite",
    description: "Experience the royal Nizam heritage in this beautifully restored architectural landmark, featuring antique furnishings, marble arches, and lush gardens.",
    image: {
      filename: "listing_hyderabad_suite",
      url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
    },
    price: 4200,
    location: "Banjara Hills, Hyderabad",
    country: "India",
    category: "City",
    geometry: { type: "Point", coordinates: [78.4482, 17.4156] },
    maxGuests: 4,
    amenities: ["WiFi", "Air conditioning", "Free parking", "Courtyard", "Kitchen"],
    averageRating: 4.85,
    reviewsCount: 24
  },
  {
    title: "Downtown Dubai Skyline Penthouse",
    description: "Ultra-luxury high-rise penthouse directly facing the Burj Khalifa and Dubai Fountain. Floor-to-ceiling glass, private wrap-around terrace, infinity plunge pool, and smart home automation.",
    image: {
      filename: "listing_dubai_penthouse",
      url: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80"
    },
    price: 24000,
    location: "Downtown, Dubai",
    country: "United Arab Emirates",
    category: "City",
    geometry: { type: "Point", coordinates: [55.2708, 25.2048] },
    maxGuests: 6,
    amenities: ["WiFi", "Pool", "Air conditioning", "Kitchen", "Free parking", "Gym access", "Elevator", "Balcony"],
    averageRating: 4.97,
    reviewsCount: 52
  },
  {
    title: "Mayfair Georgian Elegance Townhouse",
    description: "Stately 4-story Georgian residence situated moments from Hyde Park and Bond Street. High ceilings, marble gas fireplaces, private library, and formal dining salon.",
    image: {
      filename: "listing_london_townhouse",
      url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    },
    price: 16500,
    location: "Mayfair, London",
    country: "United Kingdom",
    category: "City",
    geometry: { type: "Point", coordinates: [-0.1478, 51.5099] },
    maxGuests: 6,
    amenities: ["WiFi", "Kitchen", "Heating", "Fireplace", "Washer", "Dedicated workspace"],
    averageRating: 4.92,
    reviewsCount: 33
  },
  {
    title: "Shinjuku High-Rise Neon View Loft",
    description: "Futuristic corner loft offering 270-degree panorama of Tokyo's neon skyline and Mount Fuji on clear mornings. High-speed fiber internet, Japanese soaking tub, and subway entrance downstairs.",
    image: {
      filename: "listing_tokyo_loft",
      url: "https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&w=1200&q=80"
    },
    price: 9800,
    location: "Shinjuku, Tokyo",
    country: "Japan",
    category: "City",
    geometry: { type: "Point", coordinates: [139.7034, 35.6938] },
    maxGuests: 4,
    amenities: ["WiFi", "Air conditioning", "Elevator", "Dedicated workspace", "Washer"],
    averageRating: 4.94,
    reviewsCount: 61
  },

  // ==============================================================================
  // 4. MOUNTAIN (4 Properties)
  // ==============================================================================
  {
    title: "Pine Wood Alpine Chalet",
    description: "Nestled among tall deodar and pine trees with panoramic snow-capped Himalayan mountain views. Warm fireplace, cedar interiors, and wooden sundecks.",
    image: {
      filename: "listing_manali_chalet",
      url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80"
    },
    price: 3800,
    location: "Old Manali, Himachal Pradesh",
    country: "India",
    category: "Mountain",
    geometry: { type: "Point", coordinates: [77.1887, 32.2396] },
    maxGuests: 4,
    amenities: ["WiFi", "Free parking", "Fireplace", "Mountain view", "Kitchen"],
    averageRating: 4.88,
    reviewsCount: 35
  },
  {
    title: "Matterhorn View Cedar Ski Chalet",
    description: "Ski-in ski-out luxury chalet in Zermatt offering unobstructed views of the iconic Matterhorn. Features a private outdoor hot tub, Swedish sauna, floor-to-ceiling glass, and crackling log fire.",
    image: {
      filename: "listing_zermatt_chalet",
      url: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80"
    },
    price: 21000,
    location: "Zermatt, Valais",
    country: "Switzerland",
    category: "Mountain",
    geometry: { type: "Point", coordinates: [7.7491, 45.9765] },
    maxGuests: 8,
    amenities: ["WiFi", "Hot tub", "Sauna", "Fireplace", "Ski storage", "Kitchen", "Free parking"],
    averageRating: 4.99,
    reviewsCount: 82
  },
  {
    title: "Rocky Mountain Aspen Timber Haven",
    description: "Secluded estate surrounded by golden aspen trees. Heated stone patio, outdoor fire pit, vaulted ceilings, and sweeping views across the Roaring Fork Valley.",
    image: {
      filename: "listing_aspen_haven",
      url: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80"
    },
    price: 17500,
    location: "Aspen, Colorado",
    country: "United States",
    category: "Mountain",
    geometry: { type: "Point", coordinates: [-106.8235, 39.1911] },
    maxGuests: 8,
    amenities: ["WiFi", "Free parking", "Hot tub", "Fireplace", "Kitchen", "Dedicated workspace"],
    averageRating: 4.93,
    reviewsCount: 47
  },
  {
    title: "Banff Glacial Peak Log Lodge",
    description: "Handcrafted Canadian red cedar lodge adjacent to Banff National Park. Gaze at rugged snowcapped Rockies while soaking in the outdoor cedar barrel tub.",
    image: {
      filename: "listing_banff_lodge",
      url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80"
    },
    price: 11500,
    location: "Banff, Alberta",
    country: "Canada",
    category: "Mountain",
    geometry: { type: "Point", coordinates: [-115.5708, 51.1784] },
    maxGuests: 6,
    amenities: ["WiFi", "Free parking", "Hot tub", "Fireplace", "Kitchen", "Mountain view"],
    averageRating: 4.91,
    reviewsCount: 40
  },

  // ==============================================================================
  // 5. COTTAGES (4 Properties)
  // ==============================================================================
  {
    title: "Cotswolds Thatched Rose Stone Cottage",
    description: "Quintessential 16th-century honey-stone thatched cottage with climbing English roses, wood-burning stove, flagstone floors, and tranquil brook in the back garden.",
    image: {
      filename: "listing_cotswolds_cottage",
      url: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80"
    },
    price: 7800,
    location: "Castle Combe, Wiltshire",
    country: "United Kingdom",
    category: "Cottage",
    geometry: { type: "Point", coordinates: [-2.2289, 51.4934] },
    maxGuests: 4,
    amenities: ["WiFi", "Kitchen", "Fireplace", "Garden", "Free parking", "Washer"],
    averageRating: 4.95,
    reviewsCount: 51
  },
  {
    title: "Misty Munnar Tea Plantation Stone Cottage",
    description: "Nestled high amidst rolling green tea gardens and misty mountain ridges. Features colonial fireplace, teakwood veranda, and morning tea-tasting sessions.",
    image: {
      filename: "listing_munnar_cottage",
      url: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80"
    },
    price: 4900,
    location: "Munnar, Kerala",
    country: "India",
    category: "Cottage",
    geometry: { type: "Point", coordinates: [77.0595, 10.0889] },
    maxGuests: 4,
    amenities: ["WiFi", "Free parking", "Mountain view", "Breakfast included", "Balcony"],
    averageRating: 4.90,
    reviewsCount: 37
  },
  {
    title: "Cape Cod Coastal Cedar Cottage",
    description: "Classic weathered shingle cottage nestled behind sand dunes. Short stroll through wild sea grass to private beach, with outdoor lobster cookout deck.",
    image: {
      filename: "listing_capecod_cottage",
      url: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=1200&q=80"
    },
    price: 8900,
    location: "Chatham, Massachusetts",
    country: "United States",
    category: "Cottage",
    geometry: { type: "Point", coordinates: [-69.9598, 41.6821] },
    maxGuests: 5,
    amenities: ["WiFi", "Kitchen", "Free parking", "BBQ grill", "Beach access"],
    averageRating: 4.87,
    reviewsCount: 29
  },
  {
    title: "Provence Lavender Stone Mas Cottage",
    description: "Charming stone farmhouse bordered by fragrant purple lavender and ancient cypress trees. Features rustic French kitchen, shaded pergolas, and wine terrace.",
    image: {
      filename: "listing_provence_cottage",
      url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80"
    },
    price: 9200,
    location: "Gordes, Provence",
    country: "France",
    category: "Cottage",
    geometry: { type: "Point", coordinates: [5.2008, 43.9114] },
    maxGuests: 6,
    amenities: ["WiFi", "Kitchen", "Pool", "Free parking", "Garden", "Fireplace"],
    averageRating: 4.92,
    reviewsCount: 44
  },

  // ==============================================================================
  // 6. AMAZING POOLS (4 Properties)
  // ==============================================================================
  {
    title: "Mirage Desert Infinity Pool Oasis",
    description: "Mid-century architectural wonder featuring a heated negative-edge pool that blends seamlessly into the San Jacinto desert mountain backdrop. Outdoor fire pit and daybeds.",
    image: {
      filename: "listing_mirage_pool",
      url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80"
    },
    price: 13500,
    location: "Palm Springs, California",
    country: "United States",
    category: "Pool",
    geometry: { type: "Point", coordinates: [-116.5453, 33.8303] },
    maxGuests: 6,
    amenities: ["WiFi", "Pool", "Hot tub", "Air conditioning", "BBQ grill", "Free parking"],
    averageRating: 4.96,
    reviewsCount: 58
  },
  {
    title: "Tulum Jungle Cenote & Plunge Pool Villa",
    description: "Boho-chic villa hidden within the Mayan jungle canopy. Private natural stone swimming pool, open-air rainfall showers, rooftop yoga palapa, and beach bicycles.",
    image: {
      filename: "listing_tulum_pool",
      url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80"
    },
    price: 11200,
    location: "Tulum, Quintana Roo",
    country: "Mexico",
    category: "Pool",
    geometry: { type: "Point", coordinates: [-87.4654, 20.2114] },
    maxGuests: 4,
    amenities: ["WiFi", "Pool", "Air conditioning", "Kitchen", "Free parking", "Dedicated workspace"],
    averageRating: 4.94,
    reviewsCount: 49
  },
  {
    title: "Azure Waves Mykonos Clifftop Infinity Villa",
    description: "Dazzling white Cycladic villa with an Olympic-length saltwater infinity pool cantilevered over the Aegean. Pool bar, submerged sunloungers, and sound system.",
    image: {
      filename: "listing_mykonos_pool",
      url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80"
    },
    price: 21500,
    location: "Agios Lazaros, Mykonos",
    country: "Greece",
    category: "Pool",
    geometry: { type: "Point", coordinates: [25.3289, 37.4467] },
    maxGuests: 8,
    amenities: ["WiFi", "Pool", "Hot tub", "Air conditioning", "Kitchen", "Free parking", "Balcony"],
    averageRating: 4.97,
    reviewsCount: 63
  },
  {
    title: "Udaipur Pichola Waterfront Pool Palace",
    description: "Royal Mewari heritage palace with a private marble-lined swimming pool right at the edge of Lake Pichola. Sunset palace views, jharokha balconies, and royal butler service.",
    image: {
      filename: "listing_udaipur_pool",
      url: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80"
    },
    price: 14000,
    location: "Lake Pichola, Udaipur",
    country: "India",
    category: "Pool",
    geometry: { type: "Point", coordinates: [73.6833, 24.5854] },
    maxGuests: 6,
    amenities: ["WiFi", "Pool", "Air conditioning", "Free parking", "Lake view", "Breakfast included"],
    averageRating: 4.92,
    reviewsCount: 41
  },

  // ==============================================================================
  // 7. COUNTRYSIDE / FARMS (4 Properties)
  // ==============================================================================
  {
    title: "Tuscan Vineyard & Olive Grove Country Farmhouse",
    description: "Authentic 18th-century stone farmhouse overlooking rolling Val d'Orcia hills. Walk through private olive groves, taste Chianti in the wine cellar, and bake pizza in the wood-fired outdoor oven.",
    image: {
      filename: "listing_tuscany_farm",
      url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80"
    },
    price: 10500,
    location: "Siena, Tuscany",
    country: "Italy",
    category: "Farms",
    geometry: { type: "Point", coordinates: [11.3308, 43.3188] },
    maxGuests: 8,
    amenities: ["WiFi", "Pool", "Kitchen", "Free parking", "Fireplace", "Garden", "BBQ grill"],
    averageRating: 4.98,
    reviewsCount: 72
  },
  {
    title: "Wayanad Organic Coffee Plantation Homestead",
    description: "Tranquil plantation estate tucked away in Kerala's Western Ghats. Wake to birdsong, pick fresh arabica beans, and sip artisan espresso on the wooden rain deck.",
    image: {
      filename: "listing_wayanad_farm",
      url: "https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1200&q=80"
    },
    price: 4600,
    location: "Kalpetta, Wayanad",
    country: "India",
    category: "Farms",
    geometry: { type: "Point", coordinates: [76.1320, 11.6854] },
    maxGuests: 6,
    amenities: ["WiFi", "Free parking", "Kitchen", "Plantation walk", "Breakfast included"],
    averageRating: 4.89,
    reviewsCount: 34
  },
  {
    title: "Sonoma Valley Heritage Vineyard Barn",
    description: "Converted rustic barn house set amidst 10 acres of premier Pinot Noir vines. Wrap-around porch, bocce court, chef's gourmet kitchen, and private wine barrel room.",
    image: {
      filename: "listing_sonoma_farm",
      url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80"
    },
    price: 12800,
    location: "Sonoma, California",
    country: "United States",
    category: "Farms",
    geometry: { type: "Point", coordinates: [-122.4580, 38.2919] },
    maxGuests: 6,
    amenities: ["WiFi", "Free parking", "Kitchen", "Fireplace", "Vineyard view", "BBQ grill"],
    averageRating: 4.93,
    reviewsCount: 46
  },
  {
    title: "Dorset Organic Farmhouse & Meadow Barn",
    description: "Restored English brick farmhouse on a working regenerative dairy farm. Collect fresh morning eggs, walk to the Jurassic Coast, and stargaze by the cider press patio.",
    image: {
      filename: "listing_dorset_farm",
      url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80"
    },
    price: 6900,
    location: "Dorchester, Dorset",
    country: "United Kingdom",
    category: "Farms",
    geometry: { type: "Point", coordinates: [-2.4380, 50.7155] },
    maxGuests: 5,
    amenities: ["WiFi", "Free parking", "Kitchen", "Fireplace", "Pet friendly", "Garden"],
    averageRating: 4.91,
    reviewsCount: 38
  },

  // ==============================================================================
  // 8. CAMPING & GLAMPING (3 Properties)
  // ==============================================================================
  {
    title: "Wadi Rum Starlight Martian Camp",
    description: "Ultra-modern geodesic glamping tent positioned under the world's most brilliant starfields. Panoramic glass sphere, traditional Bedouin zarb feast, and camel desert trekking.",
    image: {
      filename: "listing_wadirum_camp",
      url: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80"
    },
    price: 6500,
    location: "Wadi Rum Protected Area",
    country: "Jordan",
    category: "Camping",
    geometry: { type: "Point", coordinates: [35.4337, 29.5734] },
    maxGuests: 2,
    amenities: ["WiFi", "Air conditioning", "Breakfast included", "Desert tour", "Stargazing deck"],
    averageRating: 4.97,
    reviewsCount: 65
  },
  {
    title: "Rishikesh Riverside Glamping Eco-Retreat",
    description: "Luxury safari canvas suites perched on white sand banks of the holy Ganges river. Private bonfire pits, organic vegetarian meals, morning yoga, and river rafting excursions.",
    image: {
      filename: "listing_rishikesh_camp",
      url: "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=1200&q=80"
    },
    price: 3500,
    location: "Shivpuri, Rishikesh",
    country: "India",
    category: "Camping",
    geometry: { type: "Point", coordinates: [78.3247, 30.1290] },
    maxGuests: 3,
    amenities: ["WiFi", "Free parking", "Riverside view", "Bonfire", "Breakfast included"],
    averageRating: 4.86,
    reviewsCount: 42
  },
  {
    title: "Yosemite Pine Valley Canvas Haven",
    description: "Spacious heavy-duty canvas prospector tent surrounded by giant sequoias. Plush queen bed, cast-iron woodstove, solar charging, and immediate access to Yosemite hiking trailheads.",
    image: {
      filename: "listing_yosemite_camp",
      url: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=1200&q=80"
    },
    price: 5400,
    location: "Mariposa, Yosemite",
    country: "United States",
    category: "Camping",
    geometry: { type: "Point", coordinates: [-119.5383, 37.8651] },
    maxGuests: 4,
    amenities: ["Free parking", "Fire pit", "BBQ grill", "Mountain view", "Heater"],
    averageRating: 4.88,
    reviewsCount: 39
  },

  // ==============================================================================
  // 9. ARCTIC (2 Properties)
  // ==============================================================================
  {
    title: "Lapland Aurora Borealis Glass Igloo",
    description: "Heated thermal glass igloo located inside the Arctic Circle. Watch the Northern Lights dance directly above your motorized reclining bed with private Finnish cedar sauna.",
    image: {
      filename: "listing_lapland_igloo",
      url: "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1200&q=80"
    },
    price: 19500,
    location: "Rovaniemi, Lapland",
    country: "Finland",
    category: "Arctic",
    geometry: { type: "Point", coordinates: [25.7294, 66.5039] },
    maxGuests: 2,
    amenities: ["WiFi", "Heating", "Sauna", "Breakfast included", "Free parking", "Aurora alert"],
    averageRating: 4.99,
    reviewsCount: 91
  },
  {
    title: "Lofoten Islands Fjord Waterfront Rorbu",
    description: "Historic crimson fisherman's cabin built on wooden stilts over the crystal Arctic fjord. Panoramic view of Reinebringen peaks, midnight sun in summer, and cozy wood-burning hearth.",
    image: {
      filename: "listing_lofoten_rorbu",
      url: "https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&w=1200&q=80"
    },
    price: 12500,
    location: "Reine, Lofoten Islands",
    country: "Norway",
    category: "Arctic",
    geometry: { type: "Point", coordinates: [13.0889, 67.9333] },
    maxGuests: 4,
    amenities: ["WiFi", "Kitchen", "Heating", "Fireplace", "Fjord view", "Free parking"],
    averageRating: 4.96,
    reviewsCount: 57
  },

  // ==============================================================================
  // 10. DOMES (2 Properties)
  // ==============================================================================
  {
    title: "Atacama Celestial Geodesic Star Dome",
    description: "High-altitude geodesic observatory dome located in the world's driest desert. Equipped with a motorized Meade astronomical telescope and private deck under pristine unpolluted skies.",
    image: {
      filename: "listing_atacama_dome",
      url: "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?auto=format&fit=crop&w=1200&q=80"
    },
    price: 8800,
    location: "San Pedro de Atacama",
    country: "Chile",
    category: "Doms",
    geometry: { type: "Point", coordinates: [-68.2000, -22.9087] },
    maxGuests: 2,
    amenities: ["WiFi", "Heating", "Telescope", "Free parking", "Breakfast included", "Stargazing deck"],
    averageRating: 4.98,
    reviewsCount: 48
  },
  {
    title: "High Desert Geometric Eco-Dome Sanctuary",
    description: "Solar-powered off-grid geodesic dome on 5 acres of untouched Mojave desert wilderness. 360-degree mountain views, outdoor clawfoot bathtub under the stars, and record player lounge.",
    image: {
      filename: "listing_joshuatree_dome",
      url: "https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?auto=format&fit=crop&w=1200&q=80"
    },
    price: 7600,
    location: "Joshua Tree, California",
    country: "United States",
    category: "Doms",
    geometry: { type: "Point", coordinates: [-116.3131, 34.1347] },
    maxGuests: 3,
    amenities: ["WiFi", "Air conditioning", "Heating", "Free parking", "Outdoor tub", "Fire pit"],
    averageRating: 4.93,
    reviewsCount: 50
  },

  // ==============================================================================
  // 11. ISLANDS & BOATS / SAILBOATS (2 Properties)
  // ==============================================================================
  {
    title: "Mediterranean Luxury Catamaran Charter",
    description: "48-foot luxury sailing catamaran moored in Ibiza's turquoise calas. Private skipper, 4 en-suite cabins, teak dining deck, snorkeling gear, and sunset sailing around Es Vedrà.",
    image: {
      filename: "listing_ibiza_sailboat",
      url: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1200&q=80"
    },
    price: 28000,
    location: "Marina Ibiza, Balearic Islands",
    country: "Spain",
    category: "Sailboats",
    geometry: { type: "Point", coordinates: [1.4320, 38.9067] },
    maxGuests: 6,
    amenities: ["WiFi", "Kitchen", "Skipper included", "Snorkeling gear", "Sea view", "Sound system"],
    averageRating: 4.97,
    reviewsCount: 36
  },
  {
    title: "Kerala Backwaters Heritage Wooden Houseboat",
    description: "Handcrafted traditional Kettuvallam boat with coir and bamboo thatched roof gliding through serene palm-fringed backwater canals. Private onboard chef preparing authentic Karimeen fish curries.",
    image: {
      filename: "listing_kerala_houseboat",
      url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80"
    },
    price: 11000,
    location: "Alleppey (Alappuzha), Kerala",
    country: "India",
    category: "Sailboats",
    geometry: { type: "Point", coordinates: [76.3388, 9.4981] },
    maxGuests: 4,
    amenities: ["Air conditioning", "All meals included", "Private chef", "Canal cruise", "Balcony deck"],
    averageRating: 4.95,
    reviewsCount: 64
  }
];

async function seedDatabase(targetUri = dbUrl, shouldDisconnect = true) {
  try {
    const maskedUri = (targetUri || '').replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log("=================================================");
    console.log("   WANDERLUST PRODUCTION IDEMPOTENT DATABASE SEED ");
    console.log("=================================================");

    if (mongoose.connection.readyState !== 1) {
      console.log(`Connecting to: ${maskedUri}`);
      await mongoose.connect(targetUri);
      console.log(`Successfully connected to database: "${mongoose.connection.name}"`);
    } else {
      console.log(`Using active database connection: "${mongoose.connection.name}"`);
    }

    // Verify or create demo host user to assign valid ownership
    let demoUser = await User.findOne({ username: "demo" });
    if (!demoUser) {
      console.log("Creating default verified demo host account...");
      const newUser = new User({
        username: "demo",
        email: "demo@wanderlust.com",
        role: "admin",
        bio: "Founding Superhost & Curator of Wanderlust luxury travel collections."
      });
      demoUser = await User.register(newUser, "Demo@12345");
      console.log(`Demo host account created with ID: ${demoUser._id}`);
    } else {
      console.log(`Using existing demo host account (ID: ${demoUser._id}, Role: ${demoUser.role})`);
    }

    const initialListingCount = await Listing.countDocuments();
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const item of sampleListingsData) {
      try {
        // Idempotency: match by title AND location to prevent duplicates
        const existing = await Listing.findOne({
          title: item.title,
          location: item.location
        });

        if (existing) {
          let updated = false;
          if (existing.category !== item.category) {
            existing.category = item.category;
            updated = true;
          }
          if (!existing.geometry || !existing.geometry.coordinates || existing.geometry.coordinates.length < 2) {
            existing.geometry = item.geometry;
            updated = true;
          }
          if (!existing.amenities || existing.amenities.length === 0) {
            existing.amenities = item.amenities;
            updated = true;
          }
          if (updated) {
            await existing.save();
            updatedCount++;
            console.log(`  ~ Updated existing listing: "${item.title}"`);
          } else {
            skippedCount++;
          }
        } else {
          const newDoc = new Listing({
            ...item,
            owner: demoUser._id,
            reviews: []
          });
          await newDoc.save();
          insertedCount++;
          console.log(`  + Inserted: [${item.category}] "${item.title}" (${item.location})`);
        }
      } catch (err) {
        failedCount++;
        console.error(`  x Failed to insert "${item.title}":`, err.message);
      }
    }

    const finalListingCount = await Listing.countDocuments();

    // Category breakdown summary
    const categories = [
      "Trending", "Room", "City", "Mountain", "Cottage", 
      "Pool", "Farms", "Camping", "Arctic", "Doms", "Sailboats"
    ];
    console.log("\n-------------------------------------------------");
    console.log("            CATEGORY DISTRIBUTION                ");
    console.log("-------------------------------------------------");
    for (const cat of categories) {
      const count = await Listing.countDocuments({ category: cat });
      console.log(`  ${cat.padEnd(14)}: ${count} listings`);
    }

    console.log("-------------------------------------------------");
    console.log("               SEEDING SUMMARY                   ");
    console.log("-------------------------------------------------");
    console.log(`  Target Database:   ${mongoose.connection.name}`);
    console.log(`  Initial Listings:  ${initialListingCount}`);
    console.log(`  Newly Inserted:    ${insertedCount}`);
    console.log(`  Updated Metadata:  ${updatedCount}`);
    console.log(`  Skipped (Existed): ${skippedCount}`);
    console.log(`  Failed:            ${failedCount}`);
    console.log(`  Total In Database: ${finalListingCount}`);
    console.log("-------------------------------------------------");
    console.log("Seeding complete safely without dropping or deleting any collections.");

    return {
      success: true,
      initialCount: initialListingCount,
      insertedCount,
      updatedCount,
      totalCount: finalListingCount
    };
  } catch (error) {
    console.error("[FATAL ERROR] Seeding aborted:", error.message);
    throw error;
  } finally {
    if (shouldDisconnect && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedDatabase, sampleListingsData };
