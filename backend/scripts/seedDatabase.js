const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Listing = require('../models/list.js');
const User = require('../models/user.js');

const dbUrl = process.env.ATLAS_URI || 'mongodb://127.0.0.1:27017/wunderlust';

const sampleListingsData = [
  {
    title: "Candolim Beachfront Luxury Villa",
    description: "Step directly onto the golden sands of Candolim beach. Enjoy stunning Arabian Sea sunsets, private infinity pool, and open-air coastal living.",
    image: {
      filename: "listing_candolim_villa",
      url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
    },
    price: 6500,
    location: "Candolim, Goa",
    country: "India",
    category: "Trending",
    geometry: {
      type: "Point",
      coordinates: [73.7667, 15.5167] // [lng, lat]
    }
  },
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
    geometry: {
      type: "Point",
      coordinates: [78.4482, 17.4156]
    }
  },
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
    geometry: {
      type: "Point",
      coordinates: [77.1887, 32.2396]
    }
  },
  {
    title: "Pink City Traditional Haveli",
    description: "Authentic Rajasthani architecture with hand-painted fresco ceilings, private courtyard, tranquil water fountains, and panoramic views of Nahargarh Fort.",
    image: {
      filename: "listing_jaipur_haveli",
      url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80"
    },
    price: 5200,
    location: "Pink City, Jaipur",
    country: "India",
    category: "Cottage",
    geometry: {
      type: "Point",
      coordinates: [75.8200, 26.9200]
    }
  },
  {
    title: "Serene Backwater Coconut Grove Cottage",
    description: "Wake up to gentle ripples and swaying palms on the Vembanad Lake backwaters. Private wooden jetty, organic Kerala breakfasts, and serene nature trails.",
    image: {
      filename: "listing_kerala_cottage",
      url: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80"
    },
    price: 4800,
    location: "Alleppey, Kerala",
    country: "India",
    category: "Farms",
    geometry: {
      type: "Point",
      coordinates: [76.3388, 9.4981]
    }
  },
  {
    title: "Marine Drive Sea-Facing Designer Penthouse",
    description: "Modern minimalist penthouse overlooking the Queen's Necklace. Floor-to-ceiling glass windows, wraparound terrace, and breathtaking ocean horizons.",
    image: {
      filename: "listing_mumbai_penthouse",
      url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
    },
    price: 9500,
    location: "Marine Drive, Mumbai",
    country: "India",
    category: "City",
    geometry: {
      type: "Point",
      coordinates: [72.8258, 18.9438]
    }
  },
  {
    title: "Tropical Bamboo Villa with Private Pool",
    description: "Secluded open-concept bamboo eco-residence surrounded by rice terraces. Features an infinity pool, private yoga shala, and lush jungle sanctuary.",
    image: {
      filename: "listing_bali_villa",
      url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80"
    },
    price: 7200,
    location: "Ubud, Bali",
    country: "Indonesia",
    category: "Pool",
    geometry: {
      type: "Point",
      coordinates: [115.2625, -8.5069]
    }
  },
  {
    title: "Downtown Burj Skyline Luxury Residence",
    description: "High-floor luxury condominium directly facing the Burj Khalifa and the Dubai Fountains. Premium Italian marble, concierge service, and infinity rooftop pool.",
    image: {
      filename: "listing_dubai_condo",
      url: "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80"
    },
    price: 14500,
    location: "Downtown, Dubai",
    country: "United Arab Emirates",
    category: "City",
    geometry: {
      type: "Point",
      coordinates: [55.2708, 25.2048]
    }
  },
  {
    title: "Charming Montmartre Artist Studio",
    description: "Sunlit top-floor Parisian atelier with exposed rustic beams and classic zinc rooftop views. Located a short walk from Sacre-Coeur and vibrant cafes.",
    image: {
      filename: "listing_paris_studio",
      url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80"
    },
    price: 11000,
    location: "Montmartre, Paris",
    country: "France",
    category: "Room",
    geometry: {
      type: "Point",
      coordinates: [2.3376, 48.8867]
    }
  },
  {
    title: "Alpine Matterhorn View Ski Chalet",
    description: "Traditional timber chalet perched above Zermatt village with majestic unobstructed Matterhorn views. Ski-in/ski-out access, sauna, and hot tub.",
    image: {
      filename: "listing_swiss_chalet",
      url: "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=1200&q=80"
    },
    price: 16000,
    location: "Zermatt",
    country: "Switzerland",
    category: "Mountain",
    geometry: {
      type: "Point",
      coordinates: [7.7491, 45.9765]
    }
  },
  {
    title: "Overwater Turquoise Lagoon Villa",
    description: "Suspended above crystal-clear turquoise waters with direct ocean stairway access. Glass floor viewing panels, private sun deck, and tropical reef snorkeling.",
    image: {
      filename: "listing_maldives_villa",
      url: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=1200&q=80"
    },
    price: 22000,
    location: "North Male Atoll",
    country: "Maldives",
    category: "Sailboats",
    geometry: {
      type: "Point",
      coordinates: [73.5093, 4.1755]
    }
  },
  {
    title: "Historic Machiya Townhouse with Zen Garden",
    description: "Preserved 120-year-old traditional wooden townhouse in historic Gion. Tatami-mat living areas, cedar wood bathtub, and peaceful private moss garden.",
    image: {
      filename: "listing_kyoto_machiya",
      url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80"
    },
    price: 8500,
    location: "Kyoto",
    country: "Japan",
    category: "Trending",
    geometry: {
      type: "Point",
      coordinates: [135.7681, 35.0116]
    }
  },
  {
    title: "Cliffside Sunset Caldera Cave Suite",
    description: "Iconic whitewashed Cycladic cave dwelling carved into the Oia cliffs. Heated outdoor whirlpool, panoramic Aegean caldera views, and world-class sunsets.",
    image: {
      filename: "listing_santorini_cave",
      url: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80"
    },
    price: 13500,
    location: "Oia, Santorini",
    country: "Greece",
    category: "Trending",
    geometry: {
      type: "Point",
      coordinates: [25.3753, 36.4618]
    }
  },
  {
    title: "SoHo Cast-Iron Industrial Designer Loft",
    description: "Authentic New York loft featuring 14-foot ceilings, exposed original brick, oversized factory windows, custom chef's kitchen, and contemporary art curation.",
    image: {
      filename: "listing_soho_loft",
      url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80"
    },
    price: 12500,
    location: "SoHo, New York City",
    country: "United States",
    category: "City",
    geometry: {
      type: "Point",
      coordinates: [-74.0060, 40.7128]
    }
  },
  {
    title: "Lake Tahoe Mountainfront Timber Lodge",
    description: "Handcrafted cedar log lodge nestled directly along pine-covered lakefront trails. Private stone fire pit, canoe rack, and vaulted great room.",
    image: {
      filename: "listing_tahoe_lodge",
      url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80"
    },
    price: 6800,
    location: "Lake Tahoe, California",
    country: "United States",
    category: "Camping",
    geometry: {
      type: "Point",
      coordinates: [-120.0324, 39.0968]
    }
  },
  {
    title: "Lemon Grove Cliffside Amalfi Hideaway",
    description: "Perched above turquoise Mediterranean waters amidst fragrant terraced lemon orchards. Expansive pergola dining terrace, handcrafted ceramics, and private beach steps.",
    image: {
      filename: "listing_amalfi_villa",
      url: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80"
    },
    price: 15000,
    location: "Amalfi Coast",
    country: "Italy",
    category: "Cottage",
    geometry: {
      type: "Point",
      coordinates: [14.6027, 40.6340]
    }
  },
  {
    title: "Canadian Rockies Glacier Chalet",
    description: "Spectacular alpine home surrounded by towering peaks of Banff National Park. Floor-to-ceiling panoramic glass, wood-burning stove, and forest wildlife viewing.",
    image: {
      filename: "listing_banff_chalet",
      url: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80"
    },
    price: 8900,
    location: "Banff, Alberta",
    country: "Canada",
    category: "Mountain",
    geometry: {
      type: "Point",
      coordinates: [-115.5708, 51.1784]
    }
  },
  {
    title: "Aurora Glass Dome Eco-Cabin",
    description: "Geodesic glass dome cabin situated beneath the Arctic circle night sky. Experience panoramic views of the Northern Lights and volcanic moss plains.",
    image: {
      filename: "listing_iceland_dome",
      url: "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1200&q=80"
    },
    price: 10500,
    location: "Reykjavik Countryside",
    country: "Iceland",
    category: "Arctic",
    geometry: {
      type: "Point",
      coordinates: [-21.9426, 64.1466]
    }
  }
];

async function seedDatabase() {
  console.log("=================================================");
  console.log("   WANDERLUST SAFE IDEMPOTENT DATABASE SEEDER   ");
  console.log("=================================================");

  try {
    await mongoose.connect(dbUrl);
    console.log(`[CONNECTED] Connected to MongoDB database at: ${dbUrl}`);

    // Step 1: Inspect existing database counts
    const initialListingCount = await Listing.countDocuments();
    const initialUserCount = await User.countDocuments();
    console.log(`[STATUS] Initial State: ${initialListingCount} listings, ${initialUserCount} users.`);

    // Step 2: Ensure demo user exists
    let demoUser = await User.findOne({ username: "demo" });
    if (!demoUser) {
      console.log("[USER] Creating default demo account (username: demo)...");
      const newUser = new User({
        username: "demo",
        email: "demo@wanderlust.local"
      });
      demoUser = await User.register(newUser, "Demo@12345");
      console.log(`[USER CREATED] Demo user registered successfully with _id: ${demoUser._id}`);
    } else {
      console.log(`[USER PRESERVED] Existing demo user found with _id: ${demoUser._id}`);
    }

    // Step 3: Insert sample listings idempotently
    let insertedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const item of sampleListingsData) {
      try {
        // Duplicate detection: check if listing with same title and location exists
        const existing = await Listing.findOne({
          title: item.title,
          location: item.location
        });

        if (existing) {
          if (!existing.category && item.category) {
            existing.category = item.category;
            await existing.save();
          }
          skippedCount++;
        } else {
          const newDoc = new Listing({
            ...item,
            owner: demoUser._id,
            reviews: []
          });
          await newDoc.save();
          insertedCount++;
          console.log(`  + Inserted: "${item.title}" (${item.location})`);
        }
      } catch (err) {
        failedCount++;
        console.error(`  x Failed to insert "${item.title}":`, err.message);
      }
    }

    const finalListingCount = await Listing.countDocuments();
    console.log("-------------------------------------------------");
    console.log("               SEEDING SUMMARY                  ");
    console.log("-------------------------------------------------");
    console.log(`  Initial Listings:  ${initialListingCount}`);
    console.log(`  Newly Inserted:    ${insertedCount}`);
    console.log(`  Duplicates Skipped:${skippedCount}`);
    console.log(`  Failed:            ${failedCount}`);
    console.log(`  Total In Database: ${finalListingCount}`);
    console.log("-------------------------------------------------");
    console.log("Seeding complete without dropping or deleting any records.");

    process.exit(0);
  } catch (error) {
    console.error("[FATAL ERROR] Seeding aborted:", error);
    process.exit(1);
  }
}

seedDatabase();
