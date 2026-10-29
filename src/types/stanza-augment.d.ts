import "stanza/protocol";

declare module "stanza/protocol" {
	interface Message {
		reply?: {
			id: string;
			to?: string;
		};
		reactions?: {
			id: string;
			reactions: string[];
		};
	}
}
