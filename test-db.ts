import { createClient as createServerClient } from "@/lib/supabase-server"

async function testDatabase() {
  try {
    console.log("Testing database connection...")
    const supabase = await createServerClient()

    // Test users table
    console.log("\n📊 Checking users table...");
    const { data: users, error: usersError, count: usersCount } = await supabase
      .from("users")
      .select("*", { count: "exact" })

    if (usersError) {
      console.log("❌ Error:", usersError.message)
    } else {
      console.log(`✅ Users table exists! Total: ${usersCount} users`)
      if (users && users.length > 0) {
        console.log("Sample user:", JSON.stringify(users[0], null, 2))
      }
    }

    // Test posts table
    console.log("\n📊 Checking posts table...")
    const { data: posts, error: postsError, count: postsCount } = await supabase
      .from("posts")
      .select("*", { count: "exact" })

    if (postsError) {
      console.log("❌ Error:", postsError.message)
    } else {
      console.log(`✅ Posts table exists! Total: ${postsCount} posts`)
    }

    // Test messages table
    console.log("\n📊 Checking messages table...")
    const { data: messages, error: messagesError, count: messagesCount } = await supabase
      .from("messages")
      .select("*", { count: "exact" })

    if (messagesError) {
      console.log("❌ Error:", messagesError.message)
    } else {
      console.log(`✅ Messages table exists! Total: ${messagesCount} messages`)
    }

    console.log("\n✅ Database is working!")
  } catch (error) {
    console.error("❌ Test failed:", error)
  }
}

testDatabase()
