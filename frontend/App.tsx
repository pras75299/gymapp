import { ExpoRoot } from "expo-router";
import { registerRootComponent } from "expo";

// Must be exported or Fast Refresh won't update the context
export function App() {
  return <ExpoRoot context={require.context("./app")} />;
}

registerRootComponent(App);
