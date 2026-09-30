# Unity (purchases-unity)

Docs: https://revenuedot.app/docs/sdks/unity

In the Inspector, on the GameObject that holds the **Purchases** component:

| Field | Before | After |
|---|---|---|
| Proxy URL | (empty) | `https://revenuedot.example.com` |
| Entitlement Verification Mode | Informational | Disabled |

The `proxyURL` field is applied before the SDK is configured, also when you configure it from code with
`Purchases.PurchasesConfiguration.Builder` (runtime setup). There is no public `SetProxyURL` method; use the field.
`PurchasesConfiguration` and `EntitlementVerificationMode` are nested in the `Purchases` class, so outside it they
need the `Purchases.` prefix.

To configure from code, also check **Use Runtime Setup** on the Purchases component; without it the component
configures itself from the Inspector fields. Your script must run after `Purchases.Start()`, which creates the native
wrapper and applies the Proxy URL field; calling `Configure` earlier throws a `NullReferenceException`.
`[DefaultExecutionOrder(100)]` makes Unity call your `Start()` after it.

```csharp
using UnityEngine;

// Runs after Purchases.Start(), which creates the native wrapper and applies the Proxy URL field.
[DefaultExecutionOrder(100)]
[RequireComponent(typeof(Purchases))]
public class Store : MonoBehaviour
{
    void Start()
    {
        // Needs "Use Runtime Setup" checked on the Purchases component. The Proxy URL field still applies.
        var purchases = GetComponent<Purchases>();
        purchases.Configure(Purchases.PurchasesConfiguration.Builder.Init("appl_...")
            .SetEntitlementVerificationMode(Purchases.EntitlementVerificationMode.Disabled)
            .Build());
    }
}
```
