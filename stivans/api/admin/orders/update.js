// /api/admin/orders/update.js
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL; // Using inspect.js as reference
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supa = createClient(url, serviceKey, { auth: { persistSession: false } }); // Using inspect.js as reference

// Function to assert admin and get ID
async function getAdminUserId(req) { // Combined assertion and ID retrieval
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw new Error('No auth');

  const { data: uData, error: uErr } = await supa.auth.getUser(token);
  if (uErr || !uData?.user?.id) throw new Error('Bad auth');
  const adminId = uData.user.id;

  const { data: prof, error: pErr } = await supa
    .from('profiles').select('role').eq('id', adminId).maybeSingle();
  if (pErr) throw pErr;
  if (!prof || prof.role !== 'admin') throw new Error('Not admin');
  return adminId; // Return the admin ID
}

export default async function handler(req, res) {
    // NOTE: This file was previously named update.js but contained the logic for INSPECTING users.
    // I am assuming you want to create an ACTUAL endpoint to UPDATE orders here.
    // If you intended to keep the user inspection logic, please rename the file accordingly.

    if (req.method !== 'POST') { // Assuming updates are done via POST
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

  try {
    // --- Authenticate admin and get their ID ---
    const adminUserId = await getAdminUserId(req);

    // ***** UPDATE last_active_at for ADMIN *****
    const { error: updateActiveErr } = await supa
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', adminUserId);

    if (updateActiveErr) {
        console.warn(`[/api/admin/orders/update] Failed to update last_active_at for admin ${adminUserId}:`, updateActiveErr.message);
    }
    // ***** END UPDATE *****

    // --- Process order update ---
    const { orderId, patch } = req.body || {};
    if (!orderId || !patch || typeof patch !== 'object' || Object.keys(patch).length === 0) {
        return res.status(400).json({ error: 'Invalid payload: Missing orderId or patch data.' });
    }

    // Sanitize patch data - only allow specific fields to be updated
    const allowedFields = ['status', 'shipping_address', 'billing_address', 'subtotal', 'tax', 'shipping', 'total'];
    const updateData = {};
    let hasOrderUpdate = false;
    for (const key of allowedFields) {
        if (patch.hasOwnProperty(key)) {
            // Add validation/type checking if necessary
            if (['subtotal', 'tax', 'shipping', 'total'].includes(key)) {
                updateData[key] = Number(patch[key]) || 0; // Ensure numeric
            } else {
                 updateData[key] = patch[key];
            }
            hasOrderUpdate = true;
        }
    }

    // Update the main order table if necessary
    if (hasOrderUpdate) {
        const { error: orderUpdateError } = await supa
            .from('orders')
            .update(updateData)
            .eq('id', orderId);

        if (orderUpdateError) {
             console.error(`Error updating order ${orderId}:`, orderUpdateError);
             throw new Error(`Failed to update order details: ${orderUpdateError.message}`);
        }
    }


    // Handle order item updates separately if included in the patch
    if (patch.items && Array.isArray(patch.items)) {
        for (const itemPatch of patch.items) {
            if (!itemPatch.id) continue; // Skip items without an ID

            const itemUpdateData = {};
            if (itemPatch.hasOwnProperty('price')) itemUpdateData.price = Number(itemPatch.price) || 0;
            if (itemPatch.hasOwnProperty('quantity')) itemUpdateData.quantity = Math.max(0, Number(itemPatch.quantity) || 0); // Allow 0 quantity? Or handle deletion separately

            // Recalculate total_price for the item
             if (itemUpdateData.hasOwnProperty('price') || itemUpdateData.hasOwnProperty('quantity')) {
                 const currentItem = await supa.from('order_items').select('price, quantity').eq('id', itemPatch.id).single();
                 const newPrice = itemUpdateData.hasOwnProperty('price') ? itemUpdateData.price : currentItem.data.price;
                 const newQuantity = itemUpdateData.hasOwnProperty('quantity') ? itemUpdateData.quantity : currentItem.data.quantity;
                 itemUpdateData.total_price = newPrice * newQuantity;
                 // Also update unit_price if your logic requires it to match price
                 if (itemUpdateData.hasOwnProperty('price')) itemUpdateData.unit_price = itemUpdateData.price;
             }


            if (Object.keys(itemUpdateData).length > 0) {
                const { error: itemUpdateError } = await supa
                    .from('order_items')
                    .update(itemUpdateData)
                    .eq('id', itemPatch.id)
                    .eq('order_id', orderId); // Ensure item belongs to the order

                 if (itemUpdateError) {
                    console.error(`Error updating order item ${itemPatch.id} for order ${orderId}:`, itemUpdateError);
                    // Decide whether to throw or just warn
                    console.warn(`Failed to update order item ${itemPatch.id}: ${itemUpdateError.message}`);
                 }
            }
        }
         // Optional: Recalculate order totals based on updated items here if needed
    }

    // Fetch the updated order with items to return
     const { data: updatedOrder, error: fetchError } = await supa
      .from('orders')
      .select(`*, order_items(*)`) // Select all order fields and nested items
      .eq('id', orderId)
      .single();

     if (fetchError) {
        console.error(`Error fetching updated order ${orderId}:`, fetchError);
        // Still might return success if updates likely worked but fetch failed
        return res.status(200).json({ ok: true, message: "Order updated, but failed to fetch updated details." });
     }


    res.status(200).json({ ok: true, order: updatedOrder });

  } catch (e) {
    if (e.message === 'No auth' || e.message === 'Bad auth' || e.message === 'Not admin') {
        return res.status(401).json({ error: e.message });
    }
    console.error('Order update error:', e);
    res.status(400).json({ error: e.message || 'Failed to update order' });
  }
}