import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runDaily } from "@/lib/services/cron";
import { admin, createUser, deleteUser, setPlus, type TestUser } from "../helpers";

let owner: TestUser, friend: TestUser, outsider: TestUser, challengeId: string;
beforeAll(async () => {
  [owner, friend, outsider] = await Promise.all([createUser("defi-owner"), createUser("defi-ami"), createUser("defi-ext")]);
  const { data } = await admin.from("challenges").insert({ owner_id: owner.id, title: "100 € à nous trois", goal_cents: 10000 }).select("id").single();
  challengeId = data!.id;
  await admin.from("challenge_members").insert([{ challenge_id: challengeId, user_id: owner.id, nickname: "Lou", share_amounts: true }, { challenge_id: challengeId, user_id: friend.id, nickname: "Sam", share_amounts: false }]);
  await admin.from("saving_opportunities").insert([{ user_id: owner.id, category: "mobile", title: "Offre A", months: 12, net_saving_cents: 14400, monthly_saving_cents: 1200 }, { user_id: friend.id, category: "mobile", title: "Secret de Sam", months: 12, net_saving_cents: 9900, monthly_saving_cents: 825 }]);
  await admin.from("realized_savings").insert({ user_id: owner.id, label: "Forfait", monthly_cents: 1200, kind: "confirmed" });
});
afterAll(async () => { await Promise.all([owner, friend, outsider].map(deleteUser)); });

describe("Défi ECONOM. — confidentialité", () => {
  it("privé par défaut : un non-membre ne voit ni le défi, ni ses membres, ni sa synthèse", async () => {
    expect((await outsider.client.from("challenges").select("*")).data).toEqual([]);
    expect((await outsider.client.from("challenge_members").select("*")).data).toEqual([]);
    expect((await outsider.client.rpc("challenge_summary", { p_challenge: challengeId })).error).not.toBeNull();
    expect((await outsider.client.from("challenge_members").insert({ challenge_id: challengeId, user_id: outsider.id, nickname: "Intrus" })).error).not.toBeNull();
  });
  it("les membres ne voient que des totaux ; les montants masqués restent masqués", async () => {
    const { data, error } = await owner.client.rpc("challenge_summary", { p_challenge: challengeId });
    expect(error).toBeNull();
    const me = data.members.find((m: { is_me: boolean }) => m.is_me);
    const sam = data.members.find((m: { nickname: string }) => m.nickname === "Sam");
    expect(me).toMatchObject({ nickname: "Lou", is_owner: true, potential_cents: 14400, confirmed_monthly_cents: 1200 });
    expect(sam).toMatchObject({ shares: false, potential_cents: null, confirmed_monthly_cents: null });
    expect(JSON.stringify(data)).not.toMatch(/Secret de Sam|Offre A|user_id|@/);
    // Le détail des données d'un autre membre reste inaccessible par la RLS.
    expect((await owner.client.from("saving_opportunities").select("title").eq("user_id", friend.id)).data).toEqual([]);
  });
  it("un membre peut modifier son partage et quitter ; seul le créateur supprime le défi", async () => {
    await friend.client.from("challenge_members").update({ share_amounts: true }).eq("challenge_id", challengeId).eq("user_id", friend.id);
    const { data } = await owner.client.rpc("challenge_summary", { p_challenge: challengeId });
    expect(data.members.find((m: { nickname: string }) => m.nickname === "Sam").potential_cents).toBe(9900);
    await friend.client.from("challenge_members").update({ share_amounts: false }).eq("user_id", owner.id); // ne peut pas modifier un autre membre
    expect((await admin.from("challenge_members").select("share_amounts").eq("user_id", owner.id).single()).data!.share_amounts).toBe(true);
    expect((await friend.client.from("challenges").delete().eq("id", challengeId).select()).data).toEqual([]);
    await friend.client.from("challenge_members").delete().eq("challenge_id", challengeId).eq("user_id", friend.id);
    expect((await friend.client.from("challenges").select("id")).data).toEqual([]);
    expect((await owner.client.from("challenges").delete().eq("id", challengeId).select()).data).toHaveLength(1);
  });
});

describe("tâches planifiées", () => {
  it("rappel de prélèvement pour un abonné Plus, sans doublon si la tâche est relancée", async () => {
    await setPlus(owner.id);
    const in3 = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
    await admin.from("user_contracts").insert([{ user_id: owner.id, name: "Salle de sport", category: "sport", price_cents: 2999, next_charge_date: in3, reminder_days: 3 }, { user_id: outsider.id, name: "Gratuit sans rappel", category: "sport", price_cents: 999, next_charge_date: in3, reminder_days: 3 }]);
    await runDaily();
    await runDaily();
    const { data } = await admin.from("notifications").select("user_id, title").eq("kind", "charge_reminder").in("user_id", [owner.id, outsider.id]);
    expect(data).toEqual([{ user_id: owner.id, title: "Prélèvement à venir : Salle de sport" }]);
  });
});
