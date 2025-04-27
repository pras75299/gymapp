module.exports = ({ config }) => {
  // Default config values can be accessed via config object
  // console.log(config.name); // prints the existing app name

  return {
    ...config, // Spread the default config
    expo: {
      name: "gymlogic-frontend", // Your app name
      slug: "gymlogic-frontend", // Your app slug
      version: "1.0.0",
      orientation: "portrait",
      icon: "./assets/images/icon.png",
      scheme: "myapp",
      userInterfaceStyle: "automatic",
      splash: {
        image: "./assets/images/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
      ios: {
        supportsTablet: true,
        bundleIdentifier: "com.yourcompany.gymlogicfrontend", // Replace with your bundle ID
      },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/images/adaptive-icon.png",
          backgroundColor: "#ffffff",
        },
        package: "com.yourcompany.gymlogicfrontend", // Replace with your package name
      },
      web: {
        bundler: "metro",
        output: "static",
        favicon: "./assets/images/favicon.png",
      },
      plugins: ["expo-router"],
      experiments: {
        typedRoutes: true,
      },
      // --- ADD YOUR API URL HERE ---
      extra: {
        // IMPORTANT: Replace this with your computer's current local IP address!
        // Use `ipconfig` (Windows) or `ifconfig` (macOS/Linux) to find it.
        apiUrl: "http://192.168.0.178:8080/api", // Using localhost instead of IP
        // Add other custom keys if needed, e.g., EAS project ID
        // eas: {
        //   projectId: "YOUR_EAS_PROJECT_ID"
        // }
      },
      // ----------------------------
    },
  };
};
