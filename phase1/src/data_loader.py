import pandas as pd


def load_data():
    requests = pd.read_csv("data/maintenance_requests.csv")
    history = pd.read_csv("data/maintenance_history.csv")
    assets = pd.read_csv("data/assets.csv")

    return requests, history, assets


if __name__ == "__main__":

    requests, history, assets = load_data()

    print("\n===================================")
    print("       AROHA - PHASE 1")
    print("       DATA LOADER")
    print("===================================\n")

    print(f"Maintenance Requests : {len(requests)}")
    print(f"Historical Records   : {len(history)}")
    print(f"Assets               : {len(assets)}")

    print("\n--- New Maintenance Requests ---")
    print(requests.head())

    print("\n--- Historical Maintenance ---")
    print(history.head())

    print("\n--- Asset Data ---")
    print(assets.head())