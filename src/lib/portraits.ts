// Placeholder portraits for the fictional demo personas (from randomuser.me, stored in /public/avatars
// so the demo works offline). Real users without a photo get a generated illustration instead.

const BY_NAME: Record<string, string> = {
  "Riley Park": "u_riley",
  "Alex Rivera": "u_alex",
  "Maya Chen": "u_maya",
  "Jordan Patel": "u_jordan",
  "Priya Raman": "u_priya",
  "Marcus Johnson": "u_marcus",
  "Dr. Elena Vasquez": "u_elena",
  "Sam Okafor": "u_sam",
  "Leila Haddad": "u_leila",
  "Chris Nguyen": "u_chris",
  "Taylor Brooks": "u_taylor",
  "Diego Morales": "u_diego",
  "Aisha Bello": "u_aisha",
  "Ben Carter": "u_ben",
  "Hannah Kim": "u_hannah",
  "Noah Williams": "u_noah",
  "Grace Liu": "u_grace",
  "Omar Siddiqui": "u_omar",
  "Zoe Martin": "u_zoe",
  "Ethan Brown": "u_ethan",
  "Fatima Zahra": "u_fatima",
  "Lucas Silva": "u_lucas",
  "Isabella Rossi": "u_isabella",
  "Kevin O'Brien": "u_kevin",
  "Ravi Shah": "u_ravi",
  "Mia Thompson": "u_mia",
  "Daniel Lee": "u_daniel",
  "Sofia Garcia": "u_sofia",
  "Tyler Jackson": "u_tyler",
  "Nina Petrova": "u_nina",
  "James Wilson": "u_james",
  "Ava Davis": "u_ava",
  "Jamal Robinson": "u_jamal",
  "Emily Zhang": "u_emily",
  "Owen Murphy": "u_owen",
  "Chloe Adams": "u_chloe",
  "Arjun Mehta": "u_arjun",
  "Rosa Alvarez": "u_rosa",
};

export function portraitFor(name: string): string | null {
  const id = BY_NAME[name];
  return id ? `/avatars/${id}.jpg` : null;
}
