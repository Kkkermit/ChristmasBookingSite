export interface OrderInput {
  name: string;
  starter: string;
  /** Option for the chosen dish (e.g. gluten-free soup) - '' when the dish has none. */
  starterOption: string;
  main: string;
  mainOption: string;
  dessert: string;
  /** e.g. 'cream' or 'ice_cream' for the fudge cake. */
  dessertOption: string;
  /** Allergies / special requirements (maps to the last column of the booking form). */
  notes: string;
}

export interface Order extends OrderInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** The header section of the restaurant's booking form. */
export interface BookingDetails {
  bookingName: string;
  contactNumber: string;
  email: string;
  bookingDate: string;
  bookingTime: string;
  companyName: string;
  secondaryNumber: string;
  address: string;
}

export type BookingDetailsKey = keyof BookingDetails;

export interface PublicConfig {
  /** ISO timestamp after which orders can no longer be created, changed or deleted. */
  deadline: string;
  ordersOpen: boolean;
  /** How many people we expect to order. */
  partySize: number;
  /** Hard cap - the booking form PDF only has this many guest rows. */
  maxGuests: number;
  restaurantName: string;
}

export interface AppState {
  config: PublicConfig;
  orders: Order[];
  details: BookingDetails;
}

export interface ApiErrorBody {
  error: string;
  code?: string;
  fieldErrors?: Record<string, string>;
}
