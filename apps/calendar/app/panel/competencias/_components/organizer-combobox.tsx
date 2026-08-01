"use client";

import { ChevronDown, Plus } from "lucide-react";
import * as React from "react";
import {
  Combobox,
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxLoading,
  ComboboxTrigger,
} from "@workspace/ui/components/combobox";
import { searchUsers } from "../_actions/wca-users";
import { AddWCAUserDialog } from "./add-wca-user-dialog";
import { Button } from "@workspace/ui/components/button";
import Image from "next/image";

type OrganizerComboboxProps = {
  value: string;
  onValueChange: (value: string) => void;
  selectedOrganizers: string[];
  placeholder?: string;
};

export function OrganizerCombobox({
  value,
  onValueChange,
  selectedOrganizers,
  placeholder = "Buscar organizador...",
}: OrganizerComboboxProps) {
  const [search, setSearch] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [users, setUsers] = React.useState<
    Array<{ wcaId: string; name: string; image: string | null }>
  >([]);
  const [showAddDialog, setShowAddDialog] = React.useState(false);

  // Initial load - fetch 5 random users
  React.useEffect(() => {
    const loadInitialUsers = async () => {
      setIsLoading(true);
      const results = await searchUsers("");
      setUsers(results);
      setIsLoading(false);
    };
    loadInitialUsers();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = React.useCallback(
    debounce(async (searchTerm: string) => {
      setIsLoading(true);
      const results = await searchUsers(searchTerm);
      setUsers(results);
      setIsLoading(false);
    }, 300),
    [],
  );

  const onInputValueChange = React.useCallback(
    (value: string) => {
      setSearch(value);
      debouncedSearch(value);
    },
    [debouncedSearch],
  );

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      onValueChange(newValue);
      // Clear the input after selection
      setSearch("");
    },
    [onValueChange],
  );

  const handleUserAdded = React.useCallback(
    (user: { wcaId: string; name: string }) => {
      // Refresh the list
      searchUsers(search).then(setUsers);
      // Auto-select the new user
      onValueChange(user.wcaId);
      // Clear the input
      setSearch("");
    },
    [search, onValueChange],
  );

  const availableUsers = users.filter(
    (user) => !selectedOrganizers.includes(user.wcaId),
  );

  return (
    <>
      <Combobox
        value={value}
        onValueChange={handleValueChange}
        inputValue={search}
        onInputValueChange={onInputValueChange}
        manualFiltering
      >
        <ComboboxAnchor>
          <ComboboxInput placeholder={placeholder} />
          <ComboboxTrigger>
            <ChevronDown className="h-4 w-4" />
          </ComboboxTrigger>
        </ComboboxAnchor>
        <ComboboxContent>
          {isLoading ? (
            <ComboboxLoading label="Buscando organizadores..." />
          ) : null}
          <ComboboxEmpty
            keepVisible={!isLoading && availableUsers.length === 0}
          >
            <div className="flex flex-col items-center gap-2 p-2">
              <p className="text-sm text-muted-foreground">
                No se encontraron organizadores
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowAddDialog(true)}
                className="gap-2"
              >
                <Plus />
                Agregar nuevo organizador
              </Button>
            </div>
          </ComboboxEmpty>
          {!isLoading &&
            availableUsers.map((user) => (
              <ComboboxItem key={user.wcaId} value={user.wcaId} outset>
                <div className="flex items-center gap-2">
                  {user.image && (
                    <Image
                      src={user.image}
                      alt={user.name}
                      className="h-6 w-6 rounded-full"
                      width={24}
                      height={24}
                    />
                  )}
                  <div className="flex flex-col">
                    <span>{user.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.wcaId}
                    </span>
                  </div>
                </div>
              </ComboboxItem>
            ))}
        </ComboboxContent>
      </Combobox>

      <AddWCAUserDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onUserAdded={handleUserAdded}
      />
    </>
  );
}

function debounce<TFunction extends (...args: never[]) => unknown>(
  func: TFunction,
  wait: number,
): (...args: Parameters<TFunction>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return function (this: unknown, ...args: Parameters<TFunction>): void {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}
