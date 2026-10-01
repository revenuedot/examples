// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the one screen: current offering, Subscribe, customer info, Restore, Log in or out.
// Docs: https://revenuedot.app/docs/sdks/ios   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import RevenueCat
import SwiftUI

struct SandboxView: View {
    @StateObject private var model = SandboxModel()
    @State private var userID = "sandbox_user_1"

    var body: some View {
        NavigationStack {
            List {
                Section("Offering") {
                    if let p = model.monthly {
                        HStack {
                            Text(p.storeProduct.localizedTitle.isEmpty ? p.storeProduct.productIdentifier : p.storeProduct.localizedTitle)
                            Spacer()
                            Text(p.localizedPriceString)
                        }
                        Button("Subscribe") { Task { await model.subscribe() } }.disabled(model.busy || model.isPro)
                    } else {
                        Text("No packages loaded")
                    }
                }
                Section("Customer") {
                    LabeledContent("App user id", value: model.appUserID)
                    LabeledContent("pro entitlement", value: model.isPro ? "active" : "not active")
                    if let end = model.proExpiry { LabeledContent("Access until", value: end.formatted()) }
                    LabeledContent("Subscriptions", value: model.activeSubscriptions.isEmpty ? "none" : model.activeSubscriptions.joined(separator: ", "))
                }
                Section {
                    Button("Restore") { Task { await model.restore() } }.disabled(model.busy)
                    if model.loggedInID == nil {
                        TextField("Your user id", text: $userID).textInputAutocapitalization(.never).autocorrectionDisabled()
                    }
                    Button(model.loggedInID == nil ? "Log in" : "Log out") { Task { await model.toggleLogin(userID) } }
                        .disabled(model.busy || (model.loggedInID == nil && userID.isEmpty))
                }
                if !model.message.isEmpty { Text(model.message).foregroundStyle(.secondary) }
            }
            .navigationTitle("RevenueDot Sandbox")
            .overlay { if model.busy { ProgressView() } }
        }
        .task { await model.load() }
        .task { await model.listen() }
    }
}
