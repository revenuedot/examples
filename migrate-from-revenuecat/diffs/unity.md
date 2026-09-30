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

```csharp
using UnityEngine;

public class Store : MonoBehaviour
{
    void Start()
    {
        // Runtime setup: the Proxy URL field on the Purchases component still applies.
        var purchases = GetComponent<Purchases>();
        purchases.Configure(Purchases.PurchasesConfiguration.Builder.Init("appl_...")
            .SetEntitlementVerificationMode(Purchases.EntitlementVerificationMode.Disabled)
            .Build());
    }
}
```
