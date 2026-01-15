# Expense Tracker

A full-stack expense tracking application that allows users to record expenses, split costs between multiple users, and settle balances over time. This project includes two backend implementations, one in Go and one in Rust, both exposing identical functionality. The frontend is built using React.

## Motivation

This project was created as a practical learning experience to:

- Explore backend development in both Rust and Golang
- Understand architectural differences between the two languages
- Build a real and useful system rather than a toy example
- Practice frontend–backend integration using React

## Tech Stack

### Frontend
- React

### Backend
- Golang implementation
- Rust implementation

Both backends provide the same API and logic.

## Features Overview

- JWT-based authentication (persistent + session-based)
- Add expenses with description and amount
- Split expenses with multiple users
- View expenses with color-coded states
- View pending amounts you owe to others
- View amounts others owe you
- Automatic split balancing between users
- Four main UI tabs: Add Expense, Expense Sheet, Pending, Owed

## User Authorization

The application uses JSON Web Tokens (JWTs) for authentication.

### Logged-In Users
- Receive a persistent JWT
- Can add expenses
- Can split expenses
- Can settle balances
- Can access all four tabs

### Guest Users
- Can add expenses and view them
- Cannot split expenses
- Data persists only for the current browser session
- Session is lost if:
  - The page is refreshed
  - The tab is closed

Guest sessions are supported via short-lived session JWTs.

## Main Navigation Tabs

1. Add Expense – Create new expenses and optionally split them
2. Expense Sheet – View all expenses with color-coded balance status
3. Pending – List of amounts you owe to other users
4. Owed – List of amounts other users owe you

## Add Expense

In the Add Expense tab, users can:

- Enter an amount
- Provide a description
- Split the expense with one or more users

When an expense is split:

- The payer sees the full expense in their sheet
- Other users do not see the expense directly
- Instead, they accrue a balance of what they owe the payer

## Expense Sheet (Color Coding)

The Expense Sheet displays all expenses for the current user with the following color scheme:

- Red – Overpaid Expense
- White – Underpaid Expense
- Blue – Balanced Expense

This interface provides a quick overview of outstanding balances.

## Pending — What You Owe

The Pending tab lists all balances the user owes to others due to split expenses.

Users can:

- Settle amounts fully
- Settle amounts partially

Settlements immediately update both users’ accounts and may change expense colors.

## Owed — What Others Owe You

The Owed tab displays all outstanding amounts that other users owe to the current user.

Users can easily monitor:

- Who owes them money
- How much is owed
- Which expenses are still unsettled

## Automatic Split Balancing

The system automatically balances mutual debts between users.

### Example

1. User A pays $10 and splits with User B  
   - User A sees a red $10 expense  
   - User B owes User A $5  

2. Later, User B pays $10 and splits it with User A  
   - User B sees a red $10 expense  
   - User A owes User B $5  

The system balances these automatically:

- Both users end up with two blue expenses of $5 each
- No manual settlement required

This eliminates the need for circular or duplicate settlements.

## Building & Running the Backend

You can build and run the backend servers using the provided helper scripts.

### Rust Backend

./run_rs.sh

This script builds the Rust backend using `cargo build --release` and runs it automatically.

### Go Backend

./run_go.sh

This script builds the Go backend using `go build` and runs the resulting binary.

## Manual Build Commands (Optional)

### Rust

cargo build --release  
./target/release/expense-tracker

### Go

go build  
./expense-tracker

## Running the Application

1. Start either the Rust or Go backend  
2. Start the React frontend  
3. Interact with the system through the UI

