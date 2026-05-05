// backend/models/home/home.service.js

const getHomeContent = async (user) => {
  return {
    user: {
      id: user?.userId,
      name: user?.name || "",
      avatar: user?.avatar || null,
    },
    header: {
      title: user?.name ? `Hi, ${user.name}` : "Hi, there",
      subtitle: "Find best deals near you",
      search_placeholder: "Search products, vehicles, or property...",
      icon: "local-mall",
    },
    sectionTitles: {
      categories: "Browse Categories",
      recent: "Recently Added",
      featured: "Featured Listings",
    },
    banners: [
      {
        id: 1,
        badge: "Marketplace",
        title: "Buy & Sell\nAnything Easily",
        image_url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800",
        cta_label: "Explore Now",
        cta_icon: "sparkles-outline",
        route: "AllListings",
        is_active: true,
      },
    ],
    sellCta: {
      icon: "megaphone-outline",
      title: "Start Selling Today",
      subtitle: "Turn your unused items into cash. List for free and reach millions of buyers near you.",
      cta_label: "Post Your Ad",
      cta_icon: "add-circle-outline",
      route: "Sell",
    },
  };
};

module.exports = { getHomeContent };
