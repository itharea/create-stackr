import "dotenv/config";
import { input, password } from "@inquirer/prompts";

// Import DB eagerly so connection is established before prompts
import { isUserExistByEmail, createAdminUser } from "../domain/user/repository";

// Wait for the DB connection log to flush before prompting
await new Promise((resolve) => setTimeout(resolve, 500));

async function main() {
  console.log("\n--- Create Admin User ---\n");

  const name = await input({ message: "Name:" });
  const email = await input({ message: "Email:" });
  const pass = await password({ message: "Password:", mask: "*" });
  const confirmPass = await password({ message: "Confirm Password:", mask: "*" });

  if (!name || !email || !pass) {
    console.error("All fields are required.");
    process.exit(1);
  }

  if (pass !== confirmPass) {
    console.error("Passwords do not match.");
    process.exit(1);
  }

  if (pass.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const { hashPassword } = await import("better-auth/crypto");

  if (await isUserExistByEmail(email)) {
    console.error(`User with email "${email}" already exists.`);
    process.exit(1);
  }

  const hashedPassword = await hashPassword(pass);

  await createAdminUser({ email, name, hashedPassword });

  console.log(`\nAdmin user created successfully!`);
  console.log(`  Email: ${email}`);
  console.log(`  Role:  admin\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to create admin user:", err.message);
  process.exit(1);
});
