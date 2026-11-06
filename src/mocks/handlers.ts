import { delay, http, HttpResponse } from "msw";
import type {
  Collector,
  Network,
  Scenario,
  User,
  Wallet,
  WalletType,
} from "../types";
import { toWei } from "../lib/money";
import { availableStock } from "../lib/availability";
import {
  account,
  addressPattern,
  changeCart,
  controlConnection,
  createQuote,
  currentCart,
  database,
  defaultEnsName,
  emailPattern,
  ensPattern,
  findNft,
  getCurrentUser,
  getDemoState,
  hashPassword,
  initializeDatabase,
  mergeVisitorCart,
  MockError,
  nextId,
  placeOrder,
  readCart,
  referralPattern,
  removeCartItem,
  replayEvent,
  resetDatabase,
  saveDatabase,
  settleOrders,
  trimmedText,
  updateNft,
  usernamePattern,
  validSecondaryAddress,
  walletTypes,
} from "./database";

type Body = Record<string, unknown>;
const scenarios: Scenario[] = [
  "success",
  "empty",
  "slow",
  "out-of-order",
  "offline",
  "server-error",
  "unauthorized",
  "favorite-error",
  "validation-error",
  "price-change",
  "sold-out",
  "order-timeout",
  "payment-refused",
  "pending",
];
async function readBody(request: Request): Promise<Body> {
  try {
    return (await request.json()) as Body;
  } catch {
    throw new MockError(
      400,
      "INVALID_JSON",
      "The request body is not valid JSON.",
    );
  }
}
const text = trimmedText;
function validateProfile(
  body: Body,
  registering = false,
): Pick<User, "name" | "email" | "username" | "ensName" | "walletNickname"> {
  const name = text(body.name),
    email = text(body.email).toLowerCase(),
    username = text(body.username).toLowerCase(),
    ensName = text(body.ensName).toLowerCase(),
    walletNickname = text(body.walletNickname),
    fields: Record<string, string> = {};
  if (name.length < 2 || name.length > 80)
    fields.name = "Use between 2 and 80 characters.";
  if (!emailPattern.test(email) || email.length > 254)
    fields.email = "Enter a valid email address.";
  if (!usernamePattern.test(username))
    fields.username = "Use 3 to 30 letters, numbers, underscores or hyphens.";
  if (!registering && !ensPattern.test(ensName))
    fields.ensName = "Enter an ENS name with 3 to 63 characters before .eth.";
  if (!registering && (!walletNickname || walletNickname.length > 60))
    fields.walletNickname = "Use a nickname of up to 60 characters.";
  if (
    registering &&
    (typeof body.password !== "string" ||
      body.password.length < 8 ||
      !/[A-Za-z]/.test(body.password) ||
      !/\d/.test(body.password))
  )
    fields.password =
      "Use at least 8 characters, including a letter and a number.";
  if (
    registering &&
    body.confirmPassword !== undefined &&
    body.confirmPassword !== body.password
  )
    fields.confirmPassword = "The passwords do not match.";
  if (Object.keys(fields).length)
    throw new MockError(
      422,
      "VALIDATION",
      "Check the highlighted fields.",
      fields,
    );
  return { name, email, username, ensName, walletNickname };
}

function assertProfileAvailable(
  fields: Pick<User, "email" | "username" | "ensName">,
  userId?: string,
) {
  const others = database().accounts.filter((item) => item.user.id !== userId);
  const conflicts: Record<string, string> = {};
  if (others.some((item) => item.user.email.toLowerCase() === fields.email))
    conflicts.email = "This email is already registered.";
  if (
    others.some((item) => item.user.username.toLowerCase() === fields.username)
  )
    conflicts.username = "This username is already registered.";
  if (
    fields.ensName &&
    others.some((item) => item.user.ensName.toLowerCase() === fields.ensName)
  )
    conflicts.ensName = "This ENS name is already registered.";
  const first = Object.keys(conflicts)[0];
  if (first)
    throw new MockError(
      409,
      first === "email"
        ? "EMAIL_CONFLICT"
        : first === "username"
          ? "USERNAME_CONFLICT"
          : "ENS_CONFLICT",
      "Some account details are already registered.",
      conflicts,
    );
}
function assertSessionScenario() {
  if (getDemoState().scenario === "unauthorized") {
    database().session = null;
    saveDatabase();
    throw new MockError(
      401,
      "SESSION_EXPIRED",
      "Your session expired. Please sign in again.",
    );
  }
}
type Handler = (
  request: Request,
  params: Record<string, string | readonly string[] | undefined>,
) => unknown | Promise<unknown>;
function route(
  method: "get" | "post" | "put" | "patch" | "delete",
  path: string,
  handler: Handler,
) {
  return http[method](`/api${path}`, async ({ request, params }) => {
    await initializeDatabase();
    const demo = path === "/demo";
    const requestUserId = getCurrentUser()?.id ?? null;
    if (!demo) {
      const settings = getDemoState(),
        url = new URL(request.url);
      const wait =
        settings.scenario === "slow"
          ? Math.max(1800, settings.latency)
          : settings.scenario === "out-of-order"
            ? (url.searchParams.get("q")?.length ?? 0) < 3
              ? 1400
              : 70
            : settings.latency;
      await delay(wait);
      if (settings.scenario === "offline") return HttpResponse.error();
      if (settings.scenario === "server-error")
        return HttpResponse.json(
          {
            code: "TRANSIENT_ERROR",
            message:
              "The service is temporarily unavailable. Please try again.",
          },
          { status: 503 },
        );
    }
    try {
      if (
        !demo &&
        !["/nfts", "/nfts/:id", "/session", "/register"].includes(path) &&
        requestUserId !== (getCurrentUser()?.id ?? null)
      )
        throw new MockError(
          409,
          "SESSION_CHANGED",
          "The account changed during this request. Please try again.",
        );
      settleOrders();
      const result = await handler(request, params);
      return result instanceof Response
        ? result
        : new HttpResponse(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
          });
    } catch (error) {
      if (error instanceof MockError)
        return HttpResponse.json(
          { code: error.code, message: error.message, fields: error.fields },
          { status: error.status },
        );
      console.error("[mock API]", error);
      return HttpResponse.json(
        {
          code: "INTERNAL_ERROR",
          message: "Something went wrong. Please try again.",
        },
        { status: 500 },
      );
    }
  });
}
export const handlers = [
  route("get", "/nfts", (request) => {
    const params = new URL(request.url).searchParams,
      q = (params.get("q") ?? params.get("search") ?? "").toLowerCase(),
      category = params.get("category"),
      collection = params.get("collection"),
      sort = params.get("sort") ?? "featured";
    const page = Math.max(1, Number(params.get("page")) || 1),
      pageSize = Math.min(24, Math.max(1, Number(params.get("pageSize")) || 8));
    const min = params.get("minPrice"),
      max = params.get("maxPrice");
    if (
      (min && !/^\d+(?:\.\d{1,18})?$/.test(min)) ||
      (max && !/^\d+(?:\.\d{1,18})?$/.test(max))
    )
      throw new MockError(
        422,
        "VALIDATION",
        "Price filters must be valid ETH decimal strings.",
      );
    let items =
      getDemoState().scenario === "empty"
        ? []
        : database().nfts.filter(
            (nft) =>
              (!q ||
                `${nft.name} ${nft.collection} ${nft.creator}`
                  .toLowerCase()
                  .includes(q)) &&
              (!category ||
                category === "all" ||
                category === "All" ||
                nft.category.toLowerCase() === category.toLowerCase()) &&
              (!collection ||
                collection === "all" ||
                nft.collection === collection) &&
              (!min || toWei(nft.price) >= toWei(min)) &&
              (!max || toWei(nft.price) <= toWei(max)) &&
              (params.get("available") !== "true" || availableStock(nft) > 0),
          );
    const comparePrice = (a: string, b: string) =>
      toWei(a) < toWei(b) ? -1 : toWei(a) > toWei(b) ? 1 : 0;
    items = [...items].sort((a, b) =>
      ["price-asc", "price-low", "price_asc"].includes(sort)
        ? comparePrice(a.price, b.price)
        : ["price-desc", "price-high", "price_desc"].includes(sort)
          ? comparePrice(b.price, a.price)
          : sort === "name"
            ? a.name.localeCompare(b.name)
            : sort === "newest"
              ? Number(b.id) - Number(a.id)
              : Number(b.featured) - Number(a.featured) ||
                Number(a.id) - Number(b.id),
    );
    const total = items.length;
    return {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
    };
  }),
  route("get", "/nfts/:id", (_request, params) => findNft(String(params.id))),
  route("get", "/session", () => {
    if (getDemoState().scenario === "unauthorized") {
      database().session = null;
      saveDatabase();
    }
    return { user: getCurrentUser() };
  }),
  route("post", "/session", async (request) => {
    const body = await readBody(request),
      email = text(body.email).toLowerCase(),
      password = typeof body.password === "string" ? body.password : "";
    if (!emailPattern.test(email) || !password)
      throw new MockError(422, "VALIDATION", "Enter your email and password.", {
        email: !emailPattern.test(email) ? "Enter a valid email address." : "",
        password: !password ? "Enter your password." : "",
      });
    const owner = database().accounts.find((item) => item.user.email === email);
    if (!owner || owner.passwordHash !== (await hashPassword(password)))
      throw new MockError(
        401,
        "INVALID_CREDENTIALS",
        "Email or password is incorrect.",
      );
    database().session = {
      userId: owner.user.id,
      expiresAt: Date.now() + 60 * 60_000,
    };
    mergeVisitorCart(owner);
    if (getDemoState().scenario === "unauthorized")
      database().demo.scenario = "success";
    saveDatabase();
    return { user: owner.user };
  }),
  route("delete", "/session", () => {
    database().session = null;
    saveDatabase();
    controlConnection("disconnect");
    controlConnection("reconnect");
    return { user: null };
  }),
  route("post", "/register", async (request) => {
    const body = await readBody(request),
      fields = validateProfile(body, true);
    assertProfileAvailable(fields);
    const id = nextId("registered-user");
    const user: User = {
      id,
      ...fields,
      ensName: defaultEnsName(fields.username, id.replace(/[^a-z0-9]/gi, "")),
      walletNickname: "Main wallet",
      avatar: "/assets/avatar.svg",
      bio: "",
    };
    const owner = {
      user,
      passwordHash: await hashPassword(body.password as string),
      wallets: [] as Wallet[],
      favorites: [] as string[],
      cart: { items: [], coupon: "", version: 1 },
    };
    database().accounts.push(owner);
    database().session = {
      userId: user.id,
      expiresAt: Date.now() + 60 * 60_000,
    };
    mergeVisitorCart(owner);
    if (getDemoState().scenario === "unauthorized")
      database().demo.scenario = "success";
    saveDatabase();
    return HttpResponse.json({ user }, { status: 201 });
  }),
  route("get", "/profile", () => {
    assertSessionScenario();
    return account().user;
  }),
  route("patch", "/profile", async (request) => {
    assertSessionScenario();
    const owner = account(),
      body = await readBody(request),
      fields = validateProfile(body);
    assertProfileAvailable(fields, owner.user.id);
    if (getDemoState().scenario === "validation-error")
      throw new MockError(
        422,
        "VALIDATION",
        "This display name is unavailable.",
        { name: "Choose a different display name." },
      );
    const bio = text(body.bio),
      avatar =
        body.avatar === undefined
          ? owner.user.avatar
          : text(body.avatar) || "/assets/avatar.svg";
    if (bio.length > 280)
      throw new MockError(422, "VALIDATION", "Your bio is too long.", {
        bio: "Use at most 280 characters.",
      });
    if (
      avatar.length > 2_800_000 ||
      !/^(\/assets\/|data:image\/(png|jpeg|webp|gif);base64,)/.test(avatar)
    )
      throw new MockError(
        422,
        "VALIDATION",
        "Use a PNG, JPEG, WebP or GIF image under 2 MB.",
        { avatar: "Invalid avatar image." },
      );
    Object.assign(owner.user, fields, { bio, avatar });
    saveDatabase();
    return owner.user;
  }),
  route("put", "/profile/password", async (request) => {
    assertSessionScenario();
    const owner = account(),
      body = await readBody(request),
      current =
        typeof body.currentPassword === "string" ? body.currentPassword : "",
      next = typeof body.newPassword === "string" ? body.newPassword : "";
    if (owner.passwordHash !== (await hashPassword(current)))
      throw new MockError(
        422,
        "INVALID_PASSWORD",
        "The current password is incorrect.",
        { currentPassword: "Incorrect password." },
      );
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next))
      throw new MockError(422, "VALIDATION", "Choose a stronger password.", {
        newPassword:
          "Use at least 8 characters, including a letter and a number.",
      });
    if (body.confirmPassword !== undefined && body.confirmPassword !== next)
      throw new MockError(422, "VALIDATION", "The passwords do not match.", {
        confirmPassword: "The passwords do not match.",
      });
    owner.passwordHash = await hashPassword(next);
    saveDatabase();
    return { message: "Password updated." };
  }),
  route("get", "/wallets", () => {
    assertSessionScenario();
    return account().wallets;
  }),
  ...(["post", "patch"] as const).map((method) =>
    route(
      method,
      method === "post" ? "/wallets" : "/wallets/:id",
      async (request, params) => {
        assertSessionScenario();
        const owner = account(),
          body = await readBody(request),
          name = text(body.name),
          nickname = text(body.nickname),
          profileName = text(body.profileName),
          type = text(body.type),
          referralCode = text(body.referralCode),
          email = text(body.email).toLowerCase(),
          ensName = text(body.ensName).toLowerCase(),
          secondaryAddress = text(body.secondaryAddress),
          address = text(body.address),
          network = text(body.network),
          fields: Record<string, string> = {};
        if (!name || name.length > 60)
          fields.name = "Use a name of up to 60 characters.";
        if (!nickname || nickname.length > 60)
          fields.nickname = "Use a nickname of up to 60 characters.";
        if (profileName.length < 2 || profileName.length > 80)
          fields.profileName = "Use between 2 and 80 characters.";
        if (!walletTypes.includes(type as WalletType))
          fields.type = "Select MetaMask, Coinbase Wallet or WalletConnect.";
        if (!referralPattern.test(referralCode))
          fields.referralCode =
            "Use 1 to 32 letters, numbers, underscores or hyphens.";
        if (!emailPattern.test(email) || email.length > 254)
          fields.email = "Enter a valid email address.";
        if (!ensPattern.test(ensName))
          fields.ensName =
            "Enter an ENS name with 3 to 63 characters before .eth.";
        if (!validSecondaryAddress(secondaryAddress))
          fields.secondaryAddress =
            "Enter a valid ENS name or a 0x wallet address.";
        if (!addressPattern.test(address))
          fields.address = "Enter a 0x address with 40 hexadecimal characters.";
        if (!["Ethereum", "Polygon"].includes(network))
          fields.network = "Select Ethereum or Polygon.";
        if (Object.keys(fields).length)
          throw new MockError(
            422,
            "VALIDATION",
            "Check the wallet details.",
            fields,
          );
        const existing =
          method === "patch"
            ? owner.wallets.find((item) => item.id === params.id)
            : undefined;
        if (method === "patch" && !existing)
          throw new MockError(404, "NOT_FOUND", "Wallet not found.");
        if (
          owner.wallets.some(
            (item) =>
              item.id !== existing?.id &&
              item.address.toLowerCase() === address.toLowerCase() &&
              item.network === network,
          )
        )
          throw new MockError(
            409,
            "WALLET_CONFLICT",
            "This wallet is already registered.",
            { address: "This wallet is already registered." },
          );
        const primary = Boolean(body.primary) || owner.wallets.length === 0;
        if (primary)
          owner.wallets.forEach((item) => {
            item.primary = false;
          });
        const wallet: Wallet = {
          id: existing?.id ?? nextId("wallet"),
          name,
          nickname,
          profileName,
          type: type as WalletType,
          referralCode,
          email,
          ensName,
          secondaryAddress: secondaryAddress || undefined,
          address,
          network: network as Network,
          primary,
        };
        if (existing) Object.assign(existing, wallet);
        else owner.wallets.push(wallet);
        if (!owner.wallets.some((item) => item.primary))
          owner.wallets[0].primary = true;
        saveDatabase();
        return wallet;
      },
    ),
  ),
  route("get", "/favorites", () => {
    assertSessionScenario();
    return account().favorites;
  }),
  route("post", "/favorites/:id", (_request, params) => {
    assertSessionScenario();
    const owner = account();
    findNft(String(params.id));
    if (getDemoState().scenario === "favorite-error")
      throw new MockError(
        503,
        "TRANSIENT_ERROR",
        "Could not save your favorite. Please try again.",
      );
    owner.favorites = Array.from(
      new Set([...owner.favorites, String(params.id)]),
    );
    saveDatabase();
    return owner.favorites;
  }),
  route("delete", "/favorites/:id", (_request, params) => {
    assertSessionScenario();
    const owner = account();
    if (getDemoState().scenario === "favorite-error")
      throw new MockError(
        503,
        "TRANSIENT_ERROR",
        "Could not update your favorites. Please try again.",
      );
    owner.favorites = owner.favorites.filter((id) => id !== params.id);
    saveDatabase();
    return owner.favorites;
  }),
  route("get", "/cart", () => readCart()),
  route("post", "/cart/items", async (request) => {
    const body = await readBody(request);
    return changeCart(
      text(body.nftId),
      text(body.editionId) || "standard",
      Number(body.quantity),
    );
  }),
  route("patch", "/cart/items/:id", async (request, params) => {
    const body = await readBody(request),
      item = currentCart().items.find((entry) => entry.id === params.id);
    if (!item) throw new MockError(404, "NOT_FOUND", "Cart item not found.");
    return changeCart(item.nftId, item.editionId, Number(body.quantity), true);
  }),
  route("delete", "/cart/items/:id", (_request, params) =>
    removeCartItem(String(params.id)),
  ),
  route("post", "/quote", async (request) => {
    const body = await readBody(request);
    return createQuote(
      body.coupon === undefined ? undefined : text(body.coupon),
    );
  }),
  route("post", "/orders", async (request) => {
    assertSessionScenario();
    const body = await readBody(request),
      input = {
        quoteId: text(body.quoteId),
        walletId: text(body.walletId),
        network: text(body.network),
        collector: body.collector as Collector,
      };
    const key =
        request.headers.get("Idempotency-Key") ?? text(body.idempotencyKey),
      order = placeOrder(input, key);
    if (getDemoState().scenario === "order-timeout") {
      database().demo.scenario = "success";
      saveDatabase();
      await delay(11000);
      return HttpResponse.error();
    }
    return HttpResponse.json(order, { status: 201 });
  }),
  route("get", "/orders", (request) => {
    assertSessionScenario();
    const owner = account(),
      key = new URL(request.url).searchParams.get("key");
    if (key) {
      const attempt = database().attempts[`${owner.user.id}:${key}`];
      if (!attempt)
        throw new MockError(
          404,
          "NOT_FOUND",
          "No order exists for this purchase reference.",
        );
      return database().orders.find((order) => order.id === attempt.orderId);
    }
    return database().orders.filter((order) => order.userId === owner.user.id);
  }),
  route("get", "/orders/:id", (_request, params) => {
    assertSessionScenario();
    const owner = account(),
      order = database().orders.find((item) => item.id === params.id);
    if (!order)
      throw new MockError(404, "NOT_FOUND", "This order could not be found.");
    if (order.userId !== owner.user.id)
      throw new MockError(
        403,
        "FORBIDDEN",
        "You do not have access to this order.",
      );
    return order;
  }),
  route("get", "/demo", () => getDemoState()),
  route("delete", "/demo", async () => {
    await resetDatabase();
    return getDemoState();
  }),
  route("patch", "/demo", async (request) => {
    const body = await readBody(request),
      state = getDemoState();
    if (body.scenario !== undefined) {
      if (!scenarios.includes(body.scenario as Scenario))
        throw new MockError(422, "VALIDATION", "Unknown demo scenario.");
      state.scenario = body.scenario as Scenario;
    }
    if (body.latency !== undefined)
      state.latency = Math.max(0, Math.min(10000, Number(body.latency) || 0));
    if (body.action === "expire-session") {
      if (database().session) database().session!.expiresAt = 0;
    }
    if (body.action === "update-nft")
      updateNft(text(body.nftId) || "1", {
        ...(body.price === undefined ? {} : { price: String(body.price) }),
        ...(body.stock === undefined ? {} : { stock: Number(body.stock) }),
      });
    if (body.action === "replay-event") replayEvent(Boolean(body.old));
    if (body.action === "disconnect" || body.action === "reconnect")
      controlConnection(body.action);
    if (body.action === "settle-orders") {
      Object.values(database().pendingOutcomes).forEach((outcome) => {
        outcome.at = 0;
      });
      if (state.scenario === "pending") state.scenario = "success";
      settleOrders();
    }
    saveDatabase();
    return state;
  }),
];
