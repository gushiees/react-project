// src/data/orders.js
import { supabase } from '../supabaseClient';

export async function createOrder({ userId, summary }) {
  // summary: { subtotal, tax, shipping, total }
  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      status: 'pending',
      subtotal: summary.subtotal,
      tax: summary.tax,
      shipping: summary.shipping,
      total: summary.total,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addOrderItems(orderId, items) {
  // items: [{ product_id, name, price, quantity, image_url }]
  const rows = items.map(i => ({
    order_id: orderId,
    product_id: i.product_id,
    name: i.name,
    price: i.price,
    quantity: i.quantity,
    image_url: i.image_url || null,
  }));
  const { error } = await supabase.from('order_items').insert(rows);
  if (error) throw error;
}

export async function insertCadaverDetails(orderId, form) {
  const { data, error } = await supabase
    .from('cadaver_details')
    .insert({
      order_id: orderId,
      full_name: form.full_name,
      dob: form.dob || null,
      age: form.age || null,
      sex: form.sex,
      civil_status: form.civil_status,
      religion: form.religion,
      death_datetime: form.death_datetime,
      place_of_death: form.place_of_death,
      cause_of_death: form.cause_of_death || null,
      kin_name: form.kin_name,
      kin_relation: form.kin_relation,
      kin_mobile: form.kin_mobile,
      kin_email: form.kin_email,
      kin_address: form.kin_address,
      remains_location: form.remains_location,
      pickup_datetime: form.pickup_datetime,
      special_instructions: form.special_instructions || null,
      death_certificate_url: form.death_certificate_url, // required
      claimant_id_url: form.claimant_id_url || null,
      permit_url: form.permit_url || null,
      occupation: form.occupation || null,
      nationality: form.nationality || null,
      residence: form.residence || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadDeathCertificate(file, userId, orderId) {
  if (!file) throw new Error('No file');
  const name = `user_${userId}/order_${orderId}/${Date.now()}_${file.name}`;
  const { error: upErr } = await supabase.storage.from('cadaver-docs').upload(name, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (upErr) throw upErr;

  // Get a public URL if bucket is public. If private, create a signed URL:
  const { data: signed, error: signErr } = await supabase
    .storage
    .from('cadaver-docs')
    .createSignedUrl(name, 60 * 60 * 24 * 7); // 7 days
  if (signErr) throw signErr;

  return signed.signedUrl; // store this in cadaver_details.death_certificate_url
}
