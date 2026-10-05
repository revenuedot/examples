// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: registers the app's root component with Expo.
// Docs: https://revenuedot.app/docs/sdks/react-native   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
