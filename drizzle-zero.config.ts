import { drizzleZeroConfig } from "drizzle-zero";
import * as drizzleSchema from "@/server/db/schema.ts";

// Define your configuration file for the CLI
export default drizzleZeroConfig(drizzleSchema, {
  // Specify which tables and columns to include in the Zero schema.
  // This allows for the "expand/migrate/contract" pattern recommended in the Zero docs.
  // When a column is first added, it should be set to false, and then changed to true
  // once the migration has been run.

  // All tables/columns must be defined, but can be set to false to exclude them from the Zero schema.
  // Column names match your Drizzle schema definitions
  tables: {
    // this can be set to false
    // e.g. user: false,
    users: {
      id: true,
      email: true,
      name: true,
    },
    persons: {
      // or this can be set to false
      // e.g. id: false,
      id: true,
      name: true,
      email: true, // New column - now enabled for Zero sync
    },
    ninjaConnections: {
      userId: true, // Enable for Zero sync
      username: true,
      password: true,
      attempts: true,
      oauthAccessToken: true,
      oauthRefreshToken: true,
      oauthExpiresAt: true,
      aylaAccessToken: true,
      aylaRefreshToken: true,
      aylaExpiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
    devices: {
      id: true, // Primary key must be enabled for Zero
      userId: true, // Enable for user association
      dsn: true, // Enable for display
      productName: true, // Enable for display
      model: true, // Enable for display
      mac: true, // Enable for display
      lanIp: true, // Enable for display
      connectionStatus: true, // Enable for display
      additionalDeviceProperties: true, // Enable for JSON modal
      createdAt: true, // Enable for timestamps
      updatedAt: true, // Enable for timestamps
    },
  },

  // Specify the casing style to use for the schema.
  // This is useful for when you want to use a different casing style than the default.
  // This works in the same way as the `casing` option in the Drizzle ORM.
  //
  // @example
  // casing: "snake_case",
});