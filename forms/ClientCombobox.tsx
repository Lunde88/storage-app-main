import { CircleUserRound } from "lucide-react";
import { EntityCombobox } from "./EntityCombobox";
import { Client, ClientInput } from "@/lib/types";

type ClientComboboxProps = {
  clientsList: Client[];
  value: ClientInput | null;
  onChange: (client: Client | null) => void;
  loading?: boolean;
  error?: Error | null | undefined;
};

export function ClientCombobox(props: ClientComboboxProps) {
  return (
    <EntityCombobox<Client>
      items={props.clientsList}
      value={props.value as Client}
      onChange={props.onChange}
      getKey={(client) => client.id}
      getDisplayLabel={(client) =>
        `${client.firstName} ${client.lastName}${
          client.companyName ? ` (${client.companyName})` : ""
        }`
      }
      getDisplayNode={(client, selected) => {
        void selected;
        return (
          <div className="flex flex-col">
            <span className="font-medium">
              {client.firstName} {client.lastName}
            </span>
            {(client.companyName || client.email) && (
              <span className="text-muted-foreground mt-0.5 flex flex-col gap-0 text-xs">
                {client.companyName && <span>{client.companyName}</span>}
                {client.email && <span>{client.email}</span>}
              </span>
            )}
          </div>
        );
      }}
      getKeywords={(client) => [
        client.firstName,
        client.lastName,
        client.companyName ?? "",
        client.email ?? "",
      ]}
      addNewLabel="Add new client"
      loading={props.loading}
      error={props.error}
      placeholder="Existing Client"
      emptyMessage="No client found."
      icon={<CircleUserRound />}
    />
  );
}
