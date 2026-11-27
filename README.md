# Trip Splitter

A simple expense-sharing app built for a group trip. It helps members record expenses, split costs, and understand who owes or receives money.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173.

Requires Node.js 22.22 or newer.

## Features

- Add and delete expenses
- Split expenses equally, by exact amounts, or by percentages
- View individual expense shares
- See each member's overall balance
- View suggested payments to settle balances
- Filter expenses by category
- Save trip data in the browser using localStorage

## Implementation decisions

**Money handling:** The assignment requires amounts to be stored in integer paise and splitting to preserve every paisa. The project follows this requirement and distributes any extra paise in participant order.

**State management:** The assignment requires Redux Toolkit for members and expenses. The project uses Redux Toolkit for shared trip data and local React state for form values and filters.

**Balance calculation:** The assignment defines a member's balance as the amount they paid minus their share of expenses. The project calculates balances from the expenses instead of storing them separately.

**Suggested payments:** The assignment requires displaying each member's balance, but does not explicitly require a settlement suggestion algorithm. The project additionally calculates suggested payments from the members' net balances.

**Persistence:** The assignment requires expenses to survive page reloads using localStorage and to fall back to sample data if saved data is missing or unreadable. The project handles persistence at the store level and validates saved data before loading it.

## Future improvements

- Add login functionality for all trip members, so each member can access their account and view the group's expenses and balances.
- Add a Paid checkbox next to suggested payments. When a member confirms that they have paid another member, record the settlement and update the outstanding balances accordingly.

## How I used AI

I used Claude as a development assistant to learn unfamiliar concepts, debug issues, and work through some complex implementation and logic tasks. I reviewed the code, understood the underlying calculations, and tested the application. I focused on making sure I could explain the important decisions and modify the code independently.
