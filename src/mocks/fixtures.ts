import type { Nft, User, Wallet } from "../types";

const titles = [
  "Emerald Ape #042",
  "Sage Nomad #009",
  "Neon Vessel #552",
  "Cosmic Bloom #118",
  "Violet Nomad #314",
  "Ivory Baron #880",
  "Golden Beat #287",
  "Golden Signal #168",
  "Electric Soul #024",
  "Parallel Worlds #128",
  "Moonlight Ape #067",
  "Wild Instinct #019",
  "Future Nostalgia #204",
  "Ethereal Flow #073",
  "Beyond Reality #089",
  "Crystal Vision #432",
  "Infinite Garden #102",
  "Urban Echoes #231",
  "Stardust Memory #044",
  "Silent Symphony #657",
  "Chromatic Pulse #301",
  "Midnight Voyage #890",
  "Sacred Geometry #155",
  "Aurora Rising #477",
];
const collections = [
  "Cosmic Visions",
  "Wild Souls",
  "Digital Expressions",
  "Future Worlds",
];
const categories = ["Art", "Photography", "Gaming", "Collectibles"];
export const nftFixtures: Nft[] = titles.map((name, i) => {
  const price = ["0.45", "0.82", "1.25", "0.18", "2.4", "0.65"][i % 6];
  const artwork = [
    "emerald-ape",
    "sage-nomad",
    "ivory-baron",
    "sage-nomad",
    "sage-nomad",
    "ivory-baron",
    "golden-beat",
    "golden-beat",
  ];
  const image = `/assets/${artwork[i % 8]}.webp`;
  return {
    id: String(i + 1),
    name,
    collection: collections[i % 4],
    creator: ["Alex Morgan", "Sofia Chen", "Lucas Silva", "Maya Rivera"][i % 4],
    category: categories[i % 4],
    description:
      "A unique piece of digital art exploring the intersection of imagination, nature and technology. Collect a limited edition and become part of the story.",
    image,
    images: [image, `/assets/${artwork[(i + 2) % 8]}.webp`],
    price,
    stock: i === 23 ? 0 : 8 + (i % 5),
    editions: [
      {
        id: "standard",
        name: "Standard edition",
        stock: i === 23 ? 0 : 8 + (i % 5),
        price,
      },
      {
        id: "rare",
        name: "Rare edition",
        stock: i % 5 === 0 ? 0 : 3,
        price: ["1.45", "1.82", "2.25", "1.18", "3.4", "1.65"][i % 6],
      },
    ],
    version: 1,
    featured: i < 4,
    likes: 24 + i * 13,
  };
});
export const userFixtures: User[] = [
  {
    id: "user-1",
    name: "Alex Morgan",
    email: "alex@example.com",
    avatar: "/assets/avatar.svg",
    bio: "Digital art collector and explorer.",
  },
  {
    id: "user-2",
    name: "Sofia Chen",
    email: "sofia@example.com",
    avatar: "/assets/avatar.svg",
    bio: "Collecting stories, one artwork at a time.",
  },
];
export function walletFixtures(userId: string): Wallet[] {
  return [
    {
      id: `${userId}-wallet-1`,
      name: "Main wallet",
      address: `0x${userId === "user-1" ? "a" : "b"}123456789012345678901234567890123456789`,
      network: "Ethereum",
      primary: true,
    },
  ];
}
