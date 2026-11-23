(function(root){
'use strict';
function create({window, console}){
async function getNextOrderRef() {
  if (!window.sb) {
    throw new Error("Supabase client not initialised");
  }

  const { data, error } = await window.sb.rpc('get_next_order_number');

  if (error) {
    console.error('get_next_order_number failed', error);
    throw error;
  }

  const assigned =
    Array.isArray(data)
      ? data[0]?.assigned
      : (data?.assigned ?? data);

  const num = Number(assigned || 0);
  return 'RTK-' + String(num).padStart(3, '0');
}
async function getOrCreateCustomer({ name, email, phone, address }) {
		  const sb = window.sb;
		  if (!sb) throw new Error('Supabase client not initialised');

		  const normEmail = email ? email.trim().toLowerCase() : null;
		  const normPhone = phone ? phone.trim() : null;

		  // 1) Try find by email
		  if (normEmail) {
			const { data: byEmail, error: e1 } = await sb
			  .from('customers')
			  .select('id, phone, email')
			  .eq('email', normEmail)
			  .maybeSingle();
			if (e1) throw e1;

			if (byEmail?.id) {
			  // Update existing
			  const updatePayload = { full_name: name, address: address || null };
			  if (!byEmail.phone && normPhone) updatePayload.phone = normPhone;

			  const { data: updated, error: e2 } = await sb
				.from('customers')
				.update(updatePayload)
				.eq('id', byEmail.id)
				.select('id')
				.single();
			  if (e2) throw e2;

			  return updated;
			}
		  }

		  // 2) Try find by phone
		  if (normPhone) {
			const { data: byPhone, error: p1 } = await sb
			  .from('customers')
			  .select('id, phone, email')
			  .eq('phone', normPhone)
			  .maybeSingle();
			if (p1) throw p1;

			if (byPhone?.id) {
			  // Update existing
			  const updatePayload = { full_name: name, address: address || null };
			  if (!byPhone.email && normEmail) updatePayload.email = normEmail;

			  const { data: updated, error: p2 } = await sb
				.from('customers')
				.update(updatePayload)
				.eq('id', byPhone.id)
				.select('id')
				.single();
			  if (p2) throw p2;

			  return updated;
			}
		  }

		  // 3) Insert new (handle unique collisions gracefully)
		  const insertPayload = {
			full_name: name,
			email: normEmail,
			phone: normPhone,
			address: address || null
		  };

		  // First attempt: insert with whatever we have
		  let { data: inserted, error: insErr } = await sb
			.from('customers')
			.insert([insertPayload])
			.select('id')
			.single();

		  if (!insErr) return inserted;

		  // If we hit a unique violation, re-fetch whichever key collided and return that row
		  if (insErr.code === '23505') {
			if (normEmail) {
			  const { data: existing, error: e3 } = await sb
				.from('customers')
				.select('id')
				.eq('email', normEmail)
				.maybeSingle();
			  if (e3) throw e3;
			  if (existing?.id) return existing;
			}

			if (normPhone) {
			  const { data: existing, error: p3 } = await sb
				.from('customers')
				.select('id')
				.eq('phone', normPhone)
				.maybeSingle();
			  if (p3) throw p3;
			  if (existing?.id) return existing;
			}
		  }

		  // Otherwise, throw the real error
		  throw insErr;
		}
return {getNextOrderRef,getOrCreateCustomer};
}
const api={create};
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.RTKCheckoutCustomerData=api;
})(typeof window==='undefined'?null:window);
