// Utility script to check existing referral bonuses
// Run this in browser console

async function checkReferralBonuses() {
  try {
    console.log("🔍 Checking existing referral bonuses...");
    
    // Import Firebase functions
    const { collection, query, where, getDocs } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    
    // Get all referral transactions
    const referralQuery = query(collection(db, 'transactions'), where("type", "==", "Referral"));
    const referralSnap = await getDocs(referralQuery);
    
    console.log(`📊 Found ${referralSnap.size} referral transactions`);
    
    const referralTransactions = referralSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Group by player who received the bonus
    const playerReferrals = {};
    
    referralTransactions.forEach(transaction => {
      const playerName = transaction.playerName;
      const referredPlayer = transaction.referenceId;
      
      if (!playerReferrals[playerName]) {
        playerReferrals[playerName] = [];
      }
      
      playerReferrals[playerName].push({
        referredPlayer: referredPlayer,
        amount: transaction.amount,
        date: transaction.date,
        transactionId: transaction.id
      });
    });
    
    // Display results
    console.log("📋 Referral Bonus Summary:");
    console.log("==========================");
    
    Object.keys(playerReferrals).forEach(playerName => {
      console.log(`\n👤 Player: ${playerName}`);
      console.log(`   Total Referral Bonuses: ${playerReferrals[playerName].length}`);
      
      playerReferrals[playerName].forEach(referral => {
        console.log(`   - Referred: ${referral.referredPlayer}`);
        console.log(`     Amount: $${referral.amount.toLocaleString()}`);
        console.log(`     Date: ${new Date(referral.date).toLocaleDateString()}`);
        console.log(`     Transaction ID: ${referral.transactionId}`);
      });
    });
    
    // Check for potential duplicates
    console.log("\n🔍 Checking for potential issues:");
    console.log("=================================");
    
    Object.keys(playerReferrals).forEach(playerName => {
      const referrals = playerReferrals[playerName];
      const referredPlayers = referrals.map(r => r.referredPlayer);
      const uniqueReferredPlayers = [...new Set(referredPlayers)];
      
      if (referredPlayers.length !== uniqueReferredPlayers.length) {
        console.log(`⚠️  POTENTIAL DUPLICATE: Player "${playerName}" has multiple referral bonuses for the same referred player`);
        
        // Find duplicates
        const duplicates = referredPlayers.filter((player, index) => referredPlayers.indexOf(player) !== index);
        console.log(`   Duplicate referred players: ${[...new Set(duplicates)].join(', ')}`);
      }
    });
    
    console.log("\n✅ Referral bonus check completed!");
    
  } catch (error) {
    console.error("❌ Error checking referral bonuses:", error);
  }
}

// Run the check
checkReferralBonuses();
