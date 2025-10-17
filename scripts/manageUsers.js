// scripts/manageUsers.js
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service key is required for writes
);

// Define initial users
const users = [
  {
    username: "frosty865",
    password: "frosty865",
    full_name: "System Administrator",
    role: "admin",
  },
  {
    username: "spsa_admin",
    password: "YourStrongPassword1!",
    full_name: "Supervisory PSA Admin",
    role: "spsa",
  },
  {
    username: "psa_field",
    password: "YourStrongPassword2!",
    full_name: "Protective Security Advisor",
    role: "psa",
  },
  {
    username: "validator_user",
    password: "YourStrongPassword3!",
    full_name: "Validator Analyst",
    role: "validator",
  },
];

// Seed users into Supabase
async function seedUsers() {
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);

    const { data, error } = await supabase
      .from("vofc_users")
      .insert([
        {
          username: u.username,
          password_hash: hash,
          full_name: u.full_name,
          role: u.role,
        },
      ])
      .select("user_id, username, role");

    if (error) console.error(`❌ Failed for ${u.username}:`, error.message);
    else console.log(`✅ Created ${u.username} (${u.role})`);
  }

  console.log("✨ User seeding complete");
}

seedUsers();
