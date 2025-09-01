// Utility script to update game names in players' gaming accounts
// Usage: node update-game-names.js <oldGameName> <newGameName>

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, getDocs, writeBatch, doc } = require('firebase/firestore');

// Firebase config - replace with your actual config
const firebaseConfig = {
  // Add your Firebase config here
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateGameNamesInPlayers(oldGameName, newGameName) {
  try {
    console.log(`🔄 Updating game name from "${oldGameName}" to "${newGameName}" in players' gaming accounts...`);
    
    const batch = writeBatch(db);
    const playersQuery = query(collection(db, "players"));
    const playersSnapshot = await getDocs(playersQuery);
    
    let updatedPlayersCount = 0;
    
    playersSnapshot.forEach((playerDoc) => {
      const playerData = playerDoc.data();
      const gamingAccounts = playerData.gamingAccounts || [];
      
      // Check if this player has gaming accounts with the old game name
      const hasOldGameAccount = gamingAccounts.some((account) => account.gameName === oldGameName);
      
      if (hasOldGameAccount) {
        // Update gaming accounts with the new game name
        const updatedGamingAccounts = gamingAccounts.map((account) => {
          if (account.gameName === oldGameName) {
            return { ...account, gameName: newGameName };
          }
          return account;
        });
        
        const playerRef = doc(db, "players", playerDoc.id);
        batch.update(playerRef, { gamingAccounts: updatedGamingAccounts });
        updatedPlayersCount++;
        
        console.log(`📝 Player "${playerData.name}" (${playerDoc.id}) - Updated gaming accounts`);
      }
    });
    
    // Commit all updates in a single batch
    if (updatedPlayersCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully updated gaming accounts for ${updatedPlayersCount} players`);
    } else {
      console.log("ℹ️ No players found with gaming accounts for this game");
    }
    
  } catch (error) {
    console.error("❌ Error updating game names:", error);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.log("Usage: node update-game-names.js <oldGameName> <newGameName>");
  console.log("Example: node update-game-names.js 'gmroom' 'gmRroom'");
  process.exit(1);
}

const [oldGameName, newGameName] = args;

// Run the update
updateGameNamesInPlayers(oldGameName, newGameName)
  .then(() => {
    console.log("🎉 Update completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Update failed:", error);
    process.exit(1);
  });
