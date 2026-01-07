// // ✅ Add this in server.js, NOT in productRoutes.js
// app.post('/api/release-reservations', async (req, res) => {
//   try {
//     const { productIds, userId } = req.body;

//     if (!productIds || !userId) {
//       console.error('❌ Missing productIds or userId');
//       return res.status(400).json({ error: 'Missing productIds or userId' });
//     }

//     console.log(`🔓 Releasing reservations for user ${userId} on ${productIds.length} products:`, productIds);

//     // Convert string IDs to ObjectIds if needed
//     const objectIds = productIds.map(id => {
//       try {
//         return new mongoose.Types.ObjectId(id);
//       } catch (err) {
//         console.warn(`⚠️ Invalid ObjectId: ${id}`);
//         return id; // Keep as string if conversion fails
//       }
//     });

//     const result = await Product.updateMany(
//       {
//         _id: { $in: objectIds },
//         reservedBy: userId,
//       },
//       {
//         $set: {
//           status: 'available', // or 'for-sale' depending on your schema
//           reservedBy: null,
//           reservedAt: null,
//           reservedUntil: null,
//         }
//       }
//     );

//     console.log(`✅ Released ${result.modifiedCount} reservations for user ${userId}`);
    
//     res.json({ 
//       success: true,
//       released: result.modifiedCount 
//     });
//   } catch (err) {
//     console.error('❌ Error releasing reservations:', err);
//     res.status(500).json({ error: err.message });
//   }
// });