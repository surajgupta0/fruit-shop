"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@fruitshop/web-core";

import { RequirePermission } from "@/src/components/RequirePermission";
import { P } from "@/src/console/permissions";
import {
  Btn,
  EmptyState,
  ErrorLine,
  Field,
  Input,
  LoadingLine,
  PageHeader,
  StatusPill,
  Surface,
} from "@/src/console/ui";
import { catalogApi } from "@/src/modules/catalog/api";

function BrandsPanel() {
  const list = useQuery(() => catalogApi.listBrands(), []);
  const [name, setName] = useState("");

  const create = useMutation(() =>
    catalogApi.createBrand({ name: name.trim(), is_active: true }),
  );

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await create.mutate();
      setName("");
      await list.refetch();
    } catch {
      /* toast */
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Brands" description="Supplier and brand labels for your fruit." />

      <Surface padded>
        <form onSubmit={onCreate} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Field label="Brand name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
          </div>
          <Btn type="submit" disabled={create.isLoading}>
            Add brand
          </Btn>
        </form>
      </Surface>

      <Surface>
        {list.isLoading && <LoadingLine />}
        {list.error && <ErrorLine message={list.error.message} />}
        {list.data && list.data.length === 0 && <EmptyState title="No brands yet" />}
        {list.data && list.data.length > 0 && (
          <ul className="divide-y divide-[var(--fs-line)]">
            {list.data.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-[var(--fs-muted)]">{b.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill tone={b.is_active ? "ok" : "neutral"}>
                    {b.is_active ? "Active" : "Off"}
                  </StatusPill>
                  <button
                    type="button"
                    className="text-xs text-[var(--fs-leaf)] hover:underline"
                    onClick={async () => {
                      try {
                        await catalogApi.updateBrand(b.id, { is_active: !b.is_active });
                        await list.refetch();
                      } catch {
                        /* toast */
                      }
                    }}
                  >
                    {b.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    className="text-xs text-rose-600 hover:underline"
                    onClick={async () => {
                      if (!confirm(`Delete ${b.name}?`)) return;
                      try {
                        await catalogApi.deleteBrand(b.id);
                        await list.refetch();
                      } catch {
                        /* toast */
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </div>
  );
}

export default function BrandsPage() {
  return (
    <RequirePermission permission={P.CATALOG_MANAGE}>
      <BrandsPanel />
    </RequirePermission>
  );
}
