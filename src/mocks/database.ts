import type {
  Cart,
  Collector,
  DemoState,
  Nft,
  Order,
  Quote,
  RealtimeEvent,
  User,
  Wallet,
  WalletType,
} from "../types";
import { fromWei, multiplyEth, toWei } from "../lib/money";
import { availableStock } from "../lib/availability";
import { nftFixtures, userFixtures, walletFixtures } from "./fixtures";

const KEY = "jungle-demo-v1";
const SCHEMA_VERSION = 2;
interface StoredCart {
  items: { id: string; nftId: string; editionId: string; quantity: number }[];
  coupon: string;
  version: number;
}
interface Account {
  user: User;
  passwordHash: string;
  wallets: Wallet[];
  favorites: string[];
  cart: StoredCart;
}
interface Database {
  schemaVersion: number;
  nfts: Nft[];
  accounts: Account[];
  visitor: StoredCart;
  session: { userId: string; expiresAt: number } | null;
  quotes: Record<string, { userId: string; quote: Quote }>;
  orders: Order[];
  attempts: Record<string, { orderId: string; payload: string }>;
  demo: DemoState;
  pendingOutcomes: Record<string, { at: number; refused: boolean }>;
  counter: number;
}
const emptyCart = (): StoredCart => ({ items: [], coupon: "", version: 1 });
const defaults = (): DemoState => ({
  scenario: "success",
  latency: 220,
  connected: true,
  seed: 1,
});
let db: Database;
let initialization: Promise<void> | undefined;
const events = new Set<(event: RealtimeEvent) => void>();
const controls = new Set<(action: "disconnect" | "reconnect") => void>();
let lastEvent: RealtimeEvent | undefined;
const copy = <T>(value: T): T => structuredClone(value);

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const usernamePattern = /^[a-z0-9][a-z0-9_-]{2,29}$/i;
export const ensPattern = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\.eth$/i;
export const addressPattern = /^0x[a-fA-F0-9]{40}$/;
export const referralPattern = /^[a-z0-9_-]{1,32}$/i;
export const walletTypes: WalletType[] = [
  "MetaMask",
  "Coinbase Wallet",
  "WalletConnect",
];
export const trimmedText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
export function defaultEnsName(username: string, suffix = "") {
  const slug = username.replace(/[^a-z0-9-]/gi, "-").replace(/-+$/, "");
  return `${slug.length >= 3 ? slug : `${slug}-collector`}${suffix ? `-${suffix}` : ""}.eth`.toLowerCase();
}
export function validSecondaryAddress(value: string) {
  return !value || addressPattern.test(value) || ensPattern.test(value);
}

function migratedWallet(wallet: Wallet, user: User): Wallet {
  return {
    ...wallet,
    nickname: wallet.nickname ?? wallet.name ?? user.walletNickname,
    profileName: wallet.profileName ?? user.name,
    type: wallet.type ?? "MetaMask",
    referralCode: wallet.referralCode ?? "JUNGLE10",
    email: wallet.email ?? user.email,
    ensName: wallet.ensName ?? user.ensName,
  };
}

function migrateDatabase() {
  if (db.schemaVersion >= SCHEMA_VERSION) return;
  // A mesma chave preserva sessão, carrinhos e pedidos de quem já abriu a demo.
  db.accounts.forEach((owner, index) => {
    const fixture = userFixtures.find((item) => item.id === owner.user.id);
    owner.user.username ??= fixture?.username ?? `collector-${index + 1}`;
    owner.user.ensName ??=
      fixture?.ensName ?? defaultEnsName(owner.user.username);
    owner.user.walletNickname ??= owner.wallets[0]?.name ?? "Main wallet";
    owner.wallets = owner.wallets.map((wallet) =>
      migratedWallet(wallet, owner.user),
    );
  });
  db.nfts.forEach((nft) => {
    nft.stock = availableStock(nft);
  });
  // Recibos e tentativas continuam com o snapshot original, inclusive os legados.
  db.schemaVersion = SCHEMA_VERSION;
  saveDatabase();
}

export function saveDatabase() {
  localStorage.setItem(KEY, JSON.stringify(db));
}
export async function hashPassword(password: string) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`jungle-demo-salt-v1:${password}`),
  );
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function initializeDatabase() {
  if (initialization) return initialization;
  initialization = (async () => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        db = JSON.parse(saved) as Database;
        migrateDatabase();
      }
    } catch {
      localStorage.removeItem(KEY);
      await resetDatabase();
    }
    if (!db) await resetDatabase();
  })();
  return initialization;
}
export async function resetDatabase() {
  const passwordHash = await hashPassword("Jungle123!");
  db = {
    schemaVersion: SCHEMA_VERSION,
    nfts: copy(nftFixtures),
    accounts: userFixtures.map((user) => ({
      user: copy(user),
      passwordHash,
      wallets: walletFixtures(user.id),
      favorites: [],
      cart: emptyCart(),
    })),
    visitor: emptyCart(),
    session: null,
    quotes: {},
    orders: [],
    attempts: {},
    pendingOutcomes: {},
    counter: 1,
    demo: defaults(),
  };
  lastEvent = undefined;
  saveDatabase();
  controls.forEach((listener) => listener("disconnect"));
  controls.forEach((listener) => listener("reconnect"));
}
export function database() {
  return db;
}
export function getDemoState() {
  return db?.demo ?? defaults();
}
export function getCurrentUser(): User | null {
  if (!db?.session || db.session.expiresAt <= Date.now()) {
    if (db?.session) {
      db.session = null;
      saveDatabase();
    }
    return null;
  }
  return (
    db.accounts.find((account) => account.user.id === db.session?.userId)
      ?.user ?? null
  );
}
export class MockError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}
export function account() {
  const user = getCurrentUser();
  if (!user)
    throw new MockError(
      401,
      "SESSION_EXPIRED",
      "Please sign in to continue. Your progress has been saved.",
    );
  return db.accounts.find((item) => item.user.id === user.id)!;
}
export function subscribeMockEvents(listener: (event: RealtimeEvent) => void) {
  events.add(listener);
  return () => {
    events.delete(listener);
  };
}
export function subscribeMockControl(
  listener: (action: "disconnect" | "reconnect") => void,
) {
  controls.add(listener);
  return () => {
    controls.delete(listener);
  };
}
export function sendMockEvent(event: RealtimeEvent) {
  lastEvent = copy(event);
  events.forEach((listener) => listener(copy(event)));
}
export function emitResource(
  type: RealtimeEvent["type"],
  resource: Nft | Order,
  userId?: string,
) {
  sendMockEvent({
    id: `${type}:${resource.id}:${resource.version}`,
    type,
    resourceId: resource.id,
    version: resource.version,
    userId,
    data: copy(resource),
  });
}
export function controlConnection(action: "disconnect" | "reconnect") {
  db.demo.connected = action === "reconnect";
  saveDatabase();
  controls.forEach((listener) => listener(action));
}
export function replayEvent(old = false) {
  if (!lastEvent) return;
  const event = copy(lastEvent);
  if (old) {
    event.version = Math.max(0, event.version - 1);
    event.id += ":old";
    event.data.version = event.version;
  }
  events.forEach((listener) => listener(event));
}
export function nextId(prefix: string) {
  return `${prefix}-${db.counter++}`;
}
export function findNft(id: string) {
  const nft = db.nfts.find((item) => item.id === id);
  if (!nft)
    throw new MockError(404, "NOT_FOUND", "This NFT could not be found.");
  return nft;
}
export function currentCart() {
  const user = getCurrentUser();
  return user
    ? db.accounts.find((item) => item.user.id === user.id)!.cart
    : db.visitor;
}
export function readCart(): Cart {
  const cart = currentCart();
  return {
    ...copy(cart),
    items: cart.items.map((item) => {
      const nft = findNft(item.nftId);
      return {
        ...item,
        nft: copy(nft),
        edition: copy(
          nft.editions.find((edition) => edition.id === item.editionId)!,
        ),
      };
    }),
  };
}
export function changeCart(
  nftId: string,
  editionId: string,
  quantity: number,
  replace = false,
) {
  const cart = currentCart(),
    nft = findNft(nftId),
    edition = nft.editions.find((item) => item.id === editionId);
  if (!edition)
    throw new MockError(
      404,
      "EDITION_NOT_FOUND",
      "This edition could not be found.",
    );
  const existing = cart.items.find(
    (item) => item.nftId === nftId && item.editionId === editionId,
  );
  const next = replace ? quantity : quantity + (existing?.quantity ?? 0);
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    !Number.isSafeInteger(next) ||
    next > edition.stock
  )
    throw new MockError(
      409,
      "STOCK_CONFLICT",
      `Only ${edition.stock} editions are available.`,
      {
        quantity:
          edition.stock > 0
            ? `Choose between 1 and ${edition.stock}.`
            : "This edition is sold out. Remove it from your cart to continue.",
      },
    );
  if (existing) existing.quantity = next;
  else
    cart.items.push({
      id: `${nftId}:${editionId}`,
      nftId,
      editionId,
      quantity: next,
    });
  cart.version++;
  saveDatabase();
  return readCart();
}
export function removeCartItem(id: string) {
  const cart = currentCart();
  cart.items = cart.items.filter((item) => item.id !== id);
  cart.version++;
  saveDatabase();
  return readCart();
}
export function mergeVisitorCart(target: Account) {
  for (const item of db.visitor.items) {
    const nft = findNft(item.nftId),
      edition = nft.editions.find((e) => e.id === item.editionId);
    if (!edition || !edition.stock) continue;
    const existing = target.cart.items.find((entry) => entry.id === item.id);
    const quantity = Math.min(
      edition.stock,
      item.quantity + (existing?.quantity ?? 0),
    );
    if (existing) existing.quantity = quantity;
    else target.cart.items.push({ ...item, quantity });
  }
  target.cart.coupon ||= db.visitor.coupon;
  target.cart.version++;
  db.visitor = emptyCart();
}
export function createQuote(couponValue?: string, persist = true): Quote {
  const cart = readCart(),
    coupon = (couponValue ?? cart.coupon).trim().toUpperCase();
  if (coupon && coupon !== "JUNGLE10")
    throw new MockError(
      422,
      coupon === "EXPIRED" ? "COUPON_EXPIRED" : "COUPON_INVALID",
      coupon === "EXPIRED"
        ? "This coupon has expired."
        : "This coupon is not valid.",
      { coupon: "Try JUNGLE10 for 10% off." },
    );
  for (const item of cart.items)
    if (
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > item.edition.stock
    )
      throw new MockError(
        409,
        "STOCK_CONFLICT",
        `${item.nft.name} has only ${item.edition.stock} editions available. Adjust your cart.`,
        {
          quantity:
            item.edition.stock > 0
              ? `Choose between 1 and ${item.edition.stock}.`
              : "Remove the sold-out edition from your cart.",
        },
      );
  const items = cart.items.map((item) => ({
    id: item.id,
    nftId: item.nftId,
    editionId: item.editionId,
    name: item.nft.name,
    image: item.nft.image,
    edition: item.edition.name,
    quantity: item.quantity,
    unitPrice: item.edition.price,
    total: multiplyEth(item.edition.price, item.quantity),
    version: item.nft.version,
  }));
  const subtotal = items.reduce((sum, item) => sum + toWei(item.total), 0n),
    discount = coupon ? subtotal / 10n : 0n,
    fee = items.length ? toWei("0.0025") : 0n;
  const fingerprint = JSON.stringify({
    items: items.map((item) => [
      item.id,
      item.quantity,
      item.unitPrice,
      item.version,
    ]),
    coupon,
    fee: fromWei(fee),
  });
  const quote: Quote = {
    id: persist ? nextId("quote") : "",
    fingerprint,
    items,
    subtotal: fromWei(subtotal),
    discount: fromWei(discount),
    fee: fromWei(fee),
    total: fromWei(subtotal - discount + fee),
    coupon,
    expiresAt: Date.now() + 5 * 60_000,
  };
  if (persist) {
    db.quotes[quote.id] = { userId: getCurrentUser()?.id ?? "visitor", quote };
    currentCart().coupon = coupon;
    saveDatabase();
  }
  return quote;
}
export function updateNft(
  id: string,
  changes: { price?: string; stock?: number },
) {
  const nft = findNft(id);
  if (changes.price !== undefined) {
    toWei(changes.price);
    nft.price = changes.price;
    nft.editions[0].price = changes.price;
  }
  if (changes.stock !== undefined) {
    if (!Number.isSafeInteger(changes.stock) || changes.stock < 0)
      throw new MockError(
        422,
        "VALIDATION",
        "Stock must be a positive integer.",
      );
    nft.editions[0].stock = changes.stock;
  }
  nft.stock = availableStock(nft);
  nft.version++;
  saveDatabase();
  emitResource("nft.updated", nft);
  return nft;
}
export function settleOrders() {
  for (const order of db.orders) {
    const outcome = db.pendingOutcomes[order.id];
    if (
      order.status !== "pending" ||
      !outcome ||
      Date.now() < outcome.at ||
      db.demo.scenario === "pending"
    )
      continue;
    let refused = outcome.refused;
    for (const item of order.quote.items) {
      const edition = findNft(item.nftId).editions.find(
        (e) => e.id === item.editionId,
      );
      if (!edition || edition.stock < item.quantity) refused = true;
    }
    order.status = refused ? "refused" : "confirmed";
    order.updatedAt = Date.now();
    order.version++;
    if (refused)
      order.reason =
        "The simulated payment was declined. Your items are still in the cart.";
    else {
      const owner = db.accounts.find((item) => item.user.id === order.userId)!;
      for (const item of order.quote.items) {
        const nft = findNft(item.nftId),
          edition = nft.editions.find((entry) => entry.id === item.editionId)!;
        edition.stock -= item.quantity;
        nft.stock = availableStock(nft);
        nft.version++;
        const cartItem = owner.cart.items.find((entry) => entry.id === item.id);
        if (cartItem)
          cartItem.quantity = Math.max(0, cartItem.quantity - item.quantity);
        emitResource("nft.updated", nft);
      }
      owner.cart.items = owner.cart.items.filter((item) => item.quantity > 0);
      owner.cart.version++;
      if (!owner.cart.items.length) owner.cart.coupon = "";
    }
    delete db.pendingOutcomes[order.id];
    saveDatabase();
    emitResource("order.updated", order, order.userId);
  }
}
function validateCollector(input: Collector | undefined): Collector {
  const collector = {
    name: trimmedText(input?.name),
    email: trimmedText(input?.email).toLowerCase(),
    username: trimmedText(input?.username).toLowerCase(),
    profileName: trimmedText(input?.profileName),
    walletType: trimmedText(input?.walletType) as WalletType,
    referralCode: trimmedText(input?.referralCode),
    ensName: trimmedText(input?.ensName).toLowerCase(),
    secondaryAddress: trimmedText(input?.secondaryAddress),
    note: trimmedText(input?.note),
  };
  const fields: Record<string, string> = {};
  if (collector.name.length < 2 || collector.name.length > 80)
    fields.name = "Use between 2 and 80 characters.";
  if (!emailPattern.test(collector.email) || collector.email.length > 254)
    fields.email = "Enter a valid email address.";
  if (!usernamePattern.test(collector.username))
    fields.username = "Use 3 to 30 letters, numbers, underscores or hyphens.";
  if (collector.profileName.length < 2 || collector.profileName.length > 80)
    fields.profileName = "Use between 2 and 80 characters.";
  if (!walletTypes.includes(collector.walletType))
    fields.walletType = "Select MetaMask, Coinbase Wallet or WalletConnect.";
  if (!referralPattern.test(collector.referralCode))
    fields.referralCode =
      "Use 1 to 32 letters, numbers, underscores or hyphens.";
  if (!ensPattern.test(collector.ensName))
    fields.ensName = "Enter an ENS name with 3 to 63 characters before .eth.";
  if (!validSecondaryAddress(collector.secondaryAddress))
    fields.secondaryAddress = "Enter a valid ENS name or a 0x wallet address.";
  if (collector.note.length > 280) fields.note = "Use at most 280 characters.";
  if (Object.keys(fields).length)
    throw new MockError(
      422,
      "VALIDATION",
      "Check the collector details.",
      fields,
    );
  return {
    ...collector,
    secondaryAddress: collector.secondaryAddress || undefined,
    note: collector.note || undefined,
  };
}

export function placeOrder(
  input: {
    quoteId: string;
    walletId: string;
    network: string;
    collector: Collector;
  },
  key: string,
) {
  const owner = account(),
    payload = JSON.stringify(input),
    scopedKey = `${owner.user.id}:${key}`;
  if (!key)
    throw new MockError(
      422,
      "IDEMPOTENCY_REQUIRED",
      "A purchase reference is required.",
    );
  const attempt = db.attempts[scopedKey];
  if (attempt) {
    if (attempt.payload !== payload)
      throw new MockError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "This purchase reference was already used with different details.",
      );
    settleOrders();
    return db.orders.find((order) => order.id === attempt.orderId)!;
  }
  const saved = db.quotes[input.quoteId];
  if (!saved || saved.userId !== owner.user.id)
    throw new MockError(
      409,
      "QUOTE_EXPIRED",
      "Please review your order to get a current quote.",
    );
  if (db.demo.scenario === "price-change" || db.demo.scenario === "sold-out") {
    const first = saved.quote.items[0];
    if (first)
      updateNft(
        first.nftId,
        db.demo.scenario === "sold-out"
          ? { stock: 0 }
          : { price: fromWei(toWei(first.unitPrice) + toWei("0.1")) },
      );
    db.demo.scenario = "success";
    saveDatabase();
  }
  const latest = createQuote(saved.quote.coupon, false);
  if (
    saved.quote.expiresAt < Date.now() ||
    latest.fingerprint !== saved.quote.fingerprint
  )
    throw new MockError(
      409,
      "QUOTE_CHANGED",
      "Price or availability changed. Review the updated quote and confirm again.",
    );
  if (!latest.items.length)
    throw new MockError(
      422,
      "EMPTY_CART",
      "Add an NFT to your cart before checking out.",
    );
  const wallet = owner.wallets.find((item) => item.id === input.walletId);
  if (!wallet)
    throw new MockError(422, "WALLET_REQUIRED", "Select a registered wallet.", {
      walletId: "Select a wallet.",
    });
  if (wallet.network !== input.network)
    throw new MockError(
      422,
      "NETWORK_MISMATCH",
      "Select the network registered for this wallet.",
      { network: "The wallet network must match." },
    );
  const collector = validateCollector(input.collector);
  if (collector.walletType !== wallet.type)
    throw new MockError(
      422,
      "WALLET_TYPE_MISMATCH",
      "Select the type registered for this wallet.",
      { walletType: "O tipo deve corresponder à carteira selecionada." },
    );
  const id = nextId("order"),
    order: Order = {
      id,
      userId: owner.user.id,
      status: "pending",
      quote: copy(saved.quote),
      wallet: copy(wallet),
      network: wallet.network,
      collector: copy(collector),
      transaction: `0x${id.replace(/[^0-9]/g, "").padStart(64, "0")}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };
  db.orders.push(order);
  db.attempts[scopedKey] = { orderId: id, payload };
  db.pendingOutcomes[id] = {
    at: Date.now() + 1800,
    refused: db.demo.scenario === "payment-refused",
  };
  saveDatabase();
  emitResource("order.updated", order, owner.user.id);
  setTimeout(settleOrders, 1850);
  return order;
}
