import type { Nft } from "../types";

// O estoque do catálogo soma as edições; a compra valida a edição escolhida.
export function availableStock(nft: Pick<Nft, "editions">): number {
  return nft.editions.reduce((total, edition) => total + edition.stock, 0);
}
