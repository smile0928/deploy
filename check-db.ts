import { createClient } from "@/lib/supabase-server"

async function checkAllTables() {
  const supabase = await createClient()

  try {
    console.log("🔍 Checking Supabase Database...\n")

    const tables = [
      "users",
      "profiles",
      "posts",
      "post_likes",
      "comments",
      "followers",
      "messages",
      "rooms",
      "room_members",
      "room_messages",
      "events",
      "event_attendees",
      "notifications",
    ]

    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select("*", { count: "exact" })
          .limit(5)

        if (error) {
          console.log(`❌ ${table}: TABLE NOT FOUND`)
          console.log(`   Error: ${error.message}\n`)
        } else {
          console.log(`✅ ${table}: ${count} rows (showing first 5)`)
          if (data && data.length > 0) {
            console.log(`   Sample data:`, JSON.stringify(data[0], null, 2))
          } else {
            console.log(`   No data yet`)
          }
          console.log()
        }
      } catch (err) {
        console.log(`❌ ${table}: ERROR - ${err}\n`)
      }
    }
  } catch (error) {
    console.error("Failed to check database:", error)
  }
}

checkAllTables()
