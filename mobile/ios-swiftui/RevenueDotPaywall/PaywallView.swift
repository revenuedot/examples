// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the paywall screen: packages of the current offering, entitlement state, restore and logIn.
// Docs: https://revenuedot.app/docs/sdks/ios   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import RevenueCat
import SwiftUI

struct PaywallView: View {
    @StateObject private var model = PaywallModel()
    @State private var userID = ""

    var body: some View {
        NavigationStack {
            List {
                Section {
                    if model.isPro {
                        Text(model.proExpiry.map { "Pro is active until \($0.formatted())" } ?? "Pro is active for life")
                    } else {
                        Text("Pro is not active")
                    }
                }
                Section("Plans") {
                    ForEach(model.packages, id: \.identifier) { package in
                        Button {
                            Task { await model.buy(package) }
                        } label: {
                            HStack {
                                Text(package.storeProduct.localizedTitle.isEmpty ? package.storeProduct.productIdentifier : package.storeProduct.localizedTitle)
                                Spacer()
                                Text(package.localizedPriceString)
                            }
                        }
                        .disabled(model.busy)
                    }
                }
                Section {
                    Button("Restore purchases") { Task { await model.restore() } }.disabled(model.busy)
                    HStack {
                        TextField("Your user id", text: $userID).textInputAutocapitalization(.never).autocorrectionDisabled()
                        Button("Log in") { Task { await model.logIn(userID) } }.disabled(model.busy || userID.isEmpty)
                    }
                } footer: {
                    Text("App user id: \(model.appUserID)")
                }
                if !model.message.isEmpty { Text(model.message).foregroundStyle(.secondary) }
            }
            .navigationTitle("Go Pro")
            .overlay { if model.busy { ProgressView() } }
        }
        .task { await model.load() }
        .task { await model.listen() }
    }
}
