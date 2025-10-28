// lib/actions/clientActions.ts
"use server";

import { getServerSupabaseClient } from "@/lib/supabaseServer";

import { cleanseClientForDB, ClientInsertInput } from "@/lib/cleanseForDB";
import { Client, DbClientInsert } from "@/lib/types";
import { keysToCamelCase } from "@/utils/case";

export async function insertClient(
  clientInput: ClientInsertInput,
): Promise<Client> {
  const supabase = await getServerSupabaseClient();

  const dbRow: DbClientInsert = cleanseClientForDB(clientInput);
  // DB fills clerk_organisation_id and created_by_user_id via defaults
  const { data, error } = await supabase
    .from("clients")
    .insert([dbRow])
    .select()
    .single();

  if (error || !data) throw error ?? new Error("Client insert failed");
  return keysToCamelCase(data) as Client;
}
