# API C# per Gestione Prezzi Magento con Workflow di Approvazione

## Struttura Progetto

```
PricingApi/
├── Controllers/
│   └── PricesController.cs
├── Models/
│   ├── PriceChange.cs
│   ├── PriceChangeLog.cs
│   └── DTOs/
│       ├── PriceImportDto.cs
│       ├── PriceApprovalDto.cs
│       └── PriceHistoryDto.cs
├── Services/
│   ├── IPriceService.cs
│   └── PriceService.cs
├── Data/
│   └── PricingDbContext.cs
└── appsettings.json
```

---

## 1. Models/PriceChange.cs

```csharp
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PricingApi.Models
{
    public enum PriceChangeStatus
    {
        Pending = 0,
        Approved = 1,
        Rejected = 2,
        Published = 3
    }

    [Table("PriceChanges")]
    public class PriceChange
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Sku { get; set; }

        [StringLength(500)]
        public string ProductName { get; set; }

        [Required]
        [StringLength(50)]
        public string StoreCode { get; set; }

        [StringLength(100)]
        public string StoreName { get; set; }

        [Column(TypeName = "decimal(18,4)")]
        public decimal? OldBasePrice { get; set; }

        [Column(TypeName = "decimal(18,4)")]
        public decimal? NewBasePrice { get; set; }

        [Column(TypeName = "decimal(18,4)")]
        public decimal? OldSpecialPrice { get; set; }

        [Column(TypeName = "decimal(18,4)")]
        public decimal? NewSpecialPrice { get; set; }

        public DateTime? OldSpecialPriceFrom { get; set; }
        public DateTime? NewSpecialPriceFrom { get; set; }

        public DateTime? OldSpecialPriceTo { get; set; }
        public DateTime? NewSpecialPriceTo { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal VatRate { get; set; }

        public PriceChangeStatus Status { get; set; } = PriceChangeStatus.Pending;

        [Required]
        [StringLength(100)]
        public string CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [StringLength(100)]
        public string? ApprovedBy { get; set; }

        public DateTime? ApprovedAt { get; set; }

        [StringLength(100)]
        public string? PublishedBy { get; set; }

        public DateTime? PublishedAt { get; set; }

        [StringLength(500)]
        public string? RejectionReason { get; set; }

        [StringLength(1000)]
        public string? Notes { get; set; }

        // Batch tracking
        [StringLength(50)]
        public string? BatchId { get; set; }
    }
}
```

---

## 2. Models/PriceChangeLog.cs

```csharp
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PricingApi.Models
{
    [Table("PriceChangeLogs")]
    public class PriceChangeLog
    {
        [Key]
        public int Id { get; set; }

        public int PriceChangeId { get; set; }

        [ForeignKey("PriceChangeId")]
        public PriceChange PriceChange { get; set; }

        [Required]
        [StringLength(50)]
        public string Action { get; set; } // Created, Approved, Rejected, Published, Modified

        [StringLength(100)]
        public string PerformedBy { get; set; }

        public DateTime PerformedAt { get; set; } = DateTime.UtcNow;

        [StringLength(1000)]
        public string? Details { get; set; }

        [StringLength(50)]
        public string? IpAddress { get; set; }
    }
}
```

---

## 3. Models/DTOs/PriceImportDto.cs

```csharp
using System;
using System.Collections.Generic;

namespace PricingApi.Models.DTOs
{
    public class PriceImportDto
    {
        public string Sku { get; set; }
        public string ProductName { get; set; }
        public string StoreCode { get; set; }
        public string StoreName { get; set; }
        public decimal? BasePriceInclVat { get; set; }
        public decimal? SpecialPriceInclVat { get; set; }
        public DateTime? SpecialPriceFrom { get; set; }
        public DateTime? SpecialPriceTo { get; set; }
        public decimal VatRate { get; set; }
    }

    public class BulkImportRequest
    {
        public List<PriceImportDto> Prices { get; set; }
        public string ImportedBy { get; set; }
        public string Notes { get; set; }
    }

    public class BulkImportResponse
    {
        public bool Success { get; set; }
        public string BatchId { get; set; }
        public int TotalCount { get; set; }
        public int ImportedCount { get; set; }
        public List<string> Errors { get; set; } = new List<string>();
    }
}
```

---

## 4. Models/DTOs/PriceApprovalDto.cs

```csharp
using System.Collections.Generic;

namespace PricingApi.Models.DTOs
{
    public class ApprovalRequest
    {
        public List<int> PriceChangeIds { get; set; }
        public string ApprovedBy { get; set; }
        public string Notes { get; set; }
    }

    public class RejectionRequest
    {
        public List<int> PriceChangeIds { get; set; }
        public string RejectedBy { get; set; }
        public string Reason { get; set; }
    }

    public class PublishRequest
    {
        public List<int> PriceChangeIds { get; set; }
        public string PublishedBy { get; set; }
    }

    public class PublishResponse
    {
        public bool Success { get; set; }
        public int PublishedCount { get; set; }
        public int FailedCount { get; set; }
        public List<PublishError> Errors { get; set; } = new List<PublishError>();
    }

    public class PublishError
    {
        public int PriceChangeId { get; set; }
        public string Sku { get; set; }
        public string Error { get; set; }
    }
}
```

---

## 5. Models/DTOs/PriceHistoryDto.cs

```csharp
using System;
using System.Collections.Generic;

namespace PricingApi.Models.DTOs
{
    public class PriceChangeListDto
    {
        public int Id { get; set; }
        public string Sku { get; set; }
        public string ProductName { get; set; }
        public string StoreCode { get; set; }
        public string StoreName { get; set; }
        public decimal? OldBasePrice { get; set; }
        public decimal? NewBasePrice { get; set; }
        public decimal? OldSpecialPrice { get; set; }
        public decimal? NewSpecialPrice { get; set; }
        public DateTime? NewSpecialPriceFrom { get; set; }
        public DateTime? NewSpecialPriceTo { get; set; }
        public decimal VatRate { get; set; }
        public string Status { get; set; }
        public string CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public string ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string BatchId { get; set; }
    }

    public class PriceHistoryDto
    {
        public string Sku { get; set; }
        public string ProductName { get; set; }
        public List<PriceChangeListDto> Changes { get; set; }
        public List<LogEntryDto> Logs { get; set; }
    }

    public class LogEntryDto
    {
        public string Action { get; set; }
        public string PerformedBy { get; set; }
        public DateTime PerformedAt { get; set; }
        public string Details { get; set; }
    }

    public class PaginatedResponse<T>
    {
        public List<T> Items { get; set; }
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    }
}
```

---

## 6. Data/PricingDbContext.cs

```csharp
using Microsoft.EntityFrameworkCore;
using PricingApi.Models;

namespace PricingApi.Data
{
    public class PricingDbContext : DbContext
    {
        public PricingDbContext(DbContextOptions<PricingDbContext> options) : base(options)
        {
        }

        public DbSet<PriceChange> PriceChanges { get; set; }
        public DbSet<PriceChangeLog> PriceChangeLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Indexes
            modelBuilder.Entity<PriceChange>()
                .HasIndex(p => p.Sku);

            modelBuilder.Entity<PriceChange>()
                .HasIndex(p => p.Status);

            modelBuilder.Entity<PriceChange>()
                .HasIndex(p => p.BatchId);

            modelBuilder.Entity<PriceChange>()
                .HasIndex(p => new { p.Sku, p.StoreCode });

            modelBuilder.Entity<PriceChangeLog>()
                .HasIndex(l => l.PriceChangeId);
        }
    }
}
```

---

## 7. Services/IPriceService.cs

```csharp
using System.Collections.Generic;
using System.Threading.Tasks;
using PricingApi.Models;
using PricingApi.Models.DTOs;

namespace PricingApi.Services
{
    public interface IPriceService
    {
        Task<BulkImportResponse> ImportPricesAsync(BulkImportRequest request);
        Task<PaginatedResponse<PriceChangeListDto>> GetPendingChangesAsync(int page, int pageSize, string storeCode = null);
        Task<PaginatedResponse<PriceChangeListDto>> GetApprovedChangesAsync(int page, int pageSize);
        Task<PriceHistoryDto> GetPriceHistoryAsync(string sku);
        Task<bool> ApproveChangesAsync(ApprovalRequest request);
        Task<bool> RejectChangesAsync(RejectionRequest request);
        Task<PublishResponse> PublishToMagentoAsync(PublishRequest request, MagentoConfig magentoConfig);
        Task<List<PriceChangeListDto>> GetChangesByBatchAsync(string batchId);
    }

    public class MagentoConfig
    {
        public string MagentoUrl { get; set; }
        public string ConsumerKey { get; set; }
        public string ConsumerSecret { get; set; }
        public string AccessToken { get; set; }
        public string AccessTokenSecret { get; set; }
    }
}
```

---

## 8. Services/PriceService.cs

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using OAuth;
using PricingApi.Data;
using PricingApi.Models;
using PricingApi.Models.DTOs;

namespace PricingApi.Services
{
    public class PriceService : IPriceService
    {
        private readonly PricingDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;

        public PriceService(PricingDbContext context, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<BulkImportResponse> ImportPricesAsync(BulkImportRequest request)
        {
            var response = new BulkImportResponse
            {
                BatchId = Guid.NewGuid().ToString("N")[..12].ToUpper(),
                TotalCount = request.Prices.Count
            };

            foreach (var priceDto in request.Prices)
            {
                try
                {
                    // Calculate net prices (without VAT)
                    var vatDivisor = 1 + (priceDto.VatRate / 100);
                    
                    var priceChange = new PriceChange
                    {
                        Sku = priceDto.Sku,
                        ProductName = priceDto.ProductName,
                        StoreCode = priceDto.StoreCode,
                        StoreName = priceDto.StoreName,
                        NewBasePrice = priceDto.BasePriceInclVat.HasValue 
                            ? Math.Round(priceDto.BasePriceInclVat.Value / vatDivisor, 4) 
                            : null,
                        NewSpecialPrice = priceDto.SpecialPriceInclVat.HasValue 
                            ? Math.Round(priceDto.SpecialPriceInclVat.Value / vatDivisor, 4) 
                            : null,
                        NewSpecialPriceFrom = priceDto.SpecialPriceFrom,
                        NewSpecialPriceTo = priceDto.SpecialPriceTo,
                        VatRate = priceDto.VatRate,
                        Status = PriceChangeStatus.Pending,
                        CreatedBy = request.ImportedBy,
                        CreatedAt = DateTime.UtcNow,
                        BatchId = response.BatchId,
                        Notes = request.Notes
                    };

                    _context.PriceChanges.Add(priceChange);
                    await _context.SaveChangesAsync();

                    // Log the creation
                    _context.PriceChangeLogs.Add(new PriceChangeLog
                    {
                        PriceChangeId = priceChange.Id,
                        Action = "Created",
                        PerformedBy = request.ImportedBy,
                        PerformedAt = DateTime.UtcNow,
                        Details = $"Imported with batch {response.BatchId}"
                    });

                    response.ImportedCount++;
                }
                catch (Exception ex)
                {
                    response.Errors.Add($"SKU {priceDto.Sku}: {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();
            response.Success = response.ImportedCount > 0;

            return response;
        }

        public async Task<PaginatedResponse<PriceChangeListDto>> GetPendingChangesAsync(int page, int pageSize, string storeCode = null)
        {
            var query = _context.PriceChanges
                .Where(p => p.Status == PriceChangeStatus.Pending);

            if (!string.IsNullOrEmpty(storeCode))
            {
                query = query.Where(p => p.StoreCode == storeCode);
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => MapToListDto(p))
                .ToListAsync();

            return new PaginatedResponse<PriceChangeListDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<PaginatedResponse<PriceChangeListDto>> GetApprovedChangesAsync(int page, int pageSize)
        {
            var query = _context.PriceChanges
                .Where(p => p.Status == PriceChangeStatus.Approved);

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(p => p.ApprovedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => MapToListDto(p))
                .ToListAsync();

            return new PaginatedResponse<PriceChangeListDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<PriceHistoryDto> GetPriceHistoryAsync(string sku)
        {
            var changes = await _context.PriceChanges
                .Where(p => p.Sku == sku)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            var changeIds = changes.Select(c => c.Id).ToList();

            var logs = await _context.PriceChangeLogs
                .Where(l => changeIds.Contains(l.PriceChangeId))
                .OrderByDescending(l => l.PerformedAt)
                .ToListAsync();

            return new PriceHistoryDto
            {
                Sku = sku,
                ProductName = changes.FirstOrDefault()?.ProductName,
                Changes = changes.Select(c => MapToListDto(c)).ToList(),
                Logs = logs.Select(l => new LogEntryDto
                {
                    Action = l.Action,
                    PerformedBy = l.PerformedBy,
                    PerformedAt = l.PerformedAt,
                    Details = l.Details
                }).ToList()
            };
        }

        public async Task<bool> ApproveChangesAsync(ApprovalRequest request)
        {
            var changes = await _context.PriceChanges
                .Where(p => request.PriceChangeIds.Contains(p.Id) && p.Status == PriceChangeStatus.Pending)
                .ToListAsync();

            foreach (var change in changes)
            {
                change.Status = PriceChangeStatus.Approved;
                change.ApprovedBy = request.ApprovedBy;
                change.ApprovedAt = DateTime.UtcNow;

                _context.PriceChangeLogs.Add(new PriceChangeLog
                {
                    PriceChangeId = change.Id,
                    Action = "Approved",
                    PerformedBy = request.ApprovedBy,
                    PerformedAt = DateTime.UtcNow,
                    Details = request.Notes
                });
            }

            await _context.SaveChangesAsync();
            return changes.Count > 0;
        }

        public async Task<bool> RejectChangesAsync(RejectionRequest request)
        {
            var changes = await _context.PriceChanges
                .Where(p => request.PriceChangeIds.Contains(p.Id) && p.Status == PriceChangeStatus.Pending)
                .ToListAsync();

            foreach (var change in changes)
            {
                change.Status = PriceChangeStatus.Rejected;
                change.RejectionReason = request.Reason;

                _context.PriceChangeLogs.Add(new PriceChangeLog
                {
                    PriceChangeId = change.Id,
                    Action = "Rejected",
                    PerformedBy = request.RejectedBy,
                    PerformedAt = DateTime.UtcNow,
                    Details = request.Reason
                });
            }

            await _context.SaveChangesAsync();
            return changes.Count > 0;
        }

        public async Task<PublishResponse> PublishToMagentoAsync(PublishRequest request, MagentoConfig magentoConfig)
        {
            var response = new PublishResponse();

            var changes = await _context.PriceChanges
                .Where(p => request.PriceChangeIds.Contains(p.Id) && p.Status == PriceChangeStatus.Approved)
                .ToListAsync();

            foreach (var change in changes)
            {
                try
                {
                    // Call Magento API
                    var success = await UpdateMagentoPrice(change, magentoConfig);

                    if (success)
                    {
                        change.Status = PriceChangeStatus.Published;
                        change.PublishedBy = request.PublishedBy;
                        change.PublishedAt = DateTime.UtcNow;

                        _context.PriceChangeLogs.Add(new PriceChangeLog
                        {
                            PriceChangeId = change.Id,
                            Action = "Published",
                            PerformedBy = request.PublishedBy,
                            PerformedAt = DateTime.UtcNow,
                            Details = "Successfully published to Magento"
                        });

                        response.PublishedCount++;
                    }
                    else
                    {
                        response.FailedCount++;
                        response.Errors.Add(new PublishError
                        {
                            PriceChangeId = change.Id,
                            Sku = change.Sku,
                            Error = "Magento API returned error"
                        });
                    }
                }
                catch (Exception ex)
                {
                    response.FailedCount++;
                    response.Errors.Add(new PublishError
                    {
                        PriceChangeId = change.Id,
                        Sku = change.Sku,
                        Error = ex.Message
                    });
                }
            }

            await _context.SaveChangesAsync();
            response.Success = response.PublishedCount > 0;

            return response;
        }

        public async Task<List<PriceChangeListDto>> GetChangesByBatchAsync(string batchId)
        {
            return await _context.PriceChanges
                .Where(p => p.BatchId == batchId)
                .OrderBy(p => p.Sku)
                .Select(p => MapToListDto(p))
                .ToListAsync();
        }

        private async Task<bool> UpdateMagentoPrice(PriceChange change, MagentoConfig config)
        {
            var client = _httpClientFactory.CreateClient();

            // Build OAuth signature
            var oauthClient = new OAuthRequest
            {
                Method = "PUT",
                SignatureMethod = OAuthSignatureMethod.HmacSha256,
                ConsumerKey = config.ConsumerKey,
                ConsumerSecret = config.ConsumerSecret,
                Token = config.AccessToken,
                TokenSecret = config.AccessTokenSecret,
                RequestUrl = $"{config.MagentoUrl}/rest/{change.StoreCode}/V1/products/{change.Sku}",
                Version = "1.0"
            };

            var authHeader = oauthClient.GetAuthorizationHeader();

            var productData = new
            {
                product = new
                {
                    sku = change.Sku,
                    price = change.NewBasePrice,
                    custom_attributes = new[]
                    {
                        new { attribute_code = "special_price", value = change.NewSpecialPrice?.ToString() ?? "" },
                        new { attribute_code = "special_from_date", value = change.NewSpecialPriceFrom?.ToString("yyyy-MM-dd") ?? "" },
                        new { attribute_code = "special_to_date", value = change.NewSpecialPriceTo?.ToString("yyyy-MM-dd") ?? "" }
                    }
                }
            };

            var request = new HttpRequestMessage(HttpMethod.Put, oauthClient.RequestUrl)
            {
                Content = new StringContent(JsonSerializer.Serialize(productData), Encoding.UTF8, "application/json")
            };
            request.Headers.Add("Authorization", authHeader);

            var response = await client.SendAsync(request);
            return response.IsSuccessStatusCode;
        }

        private static PriceChangeListDto MapToListDto(PriceChange p)
        {
            return new PriceChangeListDto
            {
                Id = p.Id,
                Sku = p.Sku,
                ProductName = p.ProductName,
                StoreCode = p.StoreCode,
                StoreName = p.StoreName,
                OldBasePrice = p.OldBasePrice,
                NewBasePrice = p.NewBasePrice,
                OldSpecialPrice = p.OldSpecialPrice,
                NewSpecialPrice = p.NewSpecialPrice,
                NewSpecialPriceFrom = p.NewSpecialPriceFrom,
                NewSpecialPriceTo = p.NewSpecialPriceTo,
                VatRate = p.VatRate,
                Status = p.Status.ToString(),
                CreatedBy = p.CreatedBy,
                CreatedAt = p.CreatedAt,
                ApprovedBy = p.ApprovedBy,
                ApprovedAt = p.ApprovedAt,
                BatchId = p.BatchId
            };
        }
    }
}
```

---

## 9. Controllers/PricesController.cs

```csharp
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using PricingApi.Models.DTOs;
using PricingApi.Services;

namespace PricingApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PricesController : ControllerBase
    {
        private readonly IPriceService _priceService;

        public PricesController(IPriceService priceService)
        {
            _priceService = priceService;
        }

        /// <summary>
        /// Import prices from Excel/frontend (saves to SQL Server as Pending)
        /// </summary>
        [HttpPost("import")]
        public async Task<ActionResult<BulkImportResponse>> ImportPrices([FromBody] BulkImportRequest request)
        {
            if (request?.Prices == null || request.Prices.Count == 0)
            {
                return BadRequest("No prices to import");
            }

            var result = await _priceService.ImportPricesAsync(request);
            return Ok(result);
        }

        /// <summary>
        /// Get all pending price changes awaiting approval
        /// </summary>
        [HttpGet("pending")]
        public async Task<ActionResult<PaginatedResponse<PriceChangeListDto>>> GetPendingChanges(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50,
            [FromQuery] string storeCode = null)
        {
            var result = await _priceService.GetPendingChangesAsync(page, pageSize, storeCode);
            return Ok(result);
        }

        /// <summary>
        /// Get all approved price changes ready to publish
        /// </summary>
        [HttpGet("approved")]
        public async Task<ActionResult<PaginatedResponse<PriceChangeListDto>>> GetApprovedChanges(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var result = await _priceService.GetApprovedChangesAsync(page, pageSize);
            return Ok(result);
        }

        /// <summary>
        /// Get price change history for a specific SKU
        /// </summary>
        [HttpGet("history/{sku}")]
        public async Task<ActionResult<PriceHistoryDto>> GetPriceHistory(string sku)
        {
            var result = await _priceService.GetPriceHistoryAsync(sku);
            return Ok(result);
        }

        /// <summary>
        /// Get all changes for a specific batch
        /// </summary>
        [HttpGet("batch/{batchId}")]
        public async Task<ActionResult> GetBatchChanges(string batchId)
        {
            var result = await _priceService.GetChangesByBatchAsync(batchId);
            return Ok(result);
        }

        /// <summary>
        /// Approve selected price changes
        /// </summary>
        [HttpPost("approve")]
        public async Task<ActionResult> ApproveChanges([FromBody] ApprovalRequest request)
        {
            if (request?.PriceChangeIds == null || request.PriceChangeIds.Count == 0)
            {
                return BadRequest("No price changes selected");
            }

            var success = await _priceService.ApproveChangesAsync(request);
            return Ok(new { success, message = success ? "Changes approved" : "No changes to approve" });
        }

        /// <summary>
        /// Reject selected price changes
        /// </summary>
        [HttpPost("reject")]
        public async Task<ActionResult> RejectChanges([FromBody] RejectionRequest request)
        {
            if (request?.PriceChangeIds == null || request.PriceChangeIds.Count == 0)
            {
                return BadRequest("No price changes selected");
            }

            var success = await _priceService.RejectChangesAsync(request);
            return Ok(new { success, message = success ? "Changes rejected" : "No changes to reject" });
        }

        /// <summary>
        /// Publish approved changes to Magento
        /// </summary>
        [HttpPost("publish")]
        public async Task<ActionResult<PublishResponse>> PublishToMagento(
            [FromBody] PublishRequest request,
            [FromHeader(Name = "X-Magento-Url")] string magentoUrl,
            [FromHeader(Name = "X-Magento-ConsumerKey")] string consumerKey,
            [FromHeader(Name = "X-Magento-ConsumerSecret")] string consumerSecret,
            [FromHeader(Name = "X-Magento-AccessToken")] string accessToken,
            [FromHeader(Name = "X-Magento-AccessTokenSecret")] string accessTokenSecret)
        {
            if (request?.PriceChangeIds == null || request.PriceChangeIds.Count == 0)
            {
                return BadRequest("No price changes selected");
            }

            var magentoConfig = new MagentoConfig
            {
                MagentoUrl = magentoUrl,
                ConsumerKey = consumerKey,
                ConsumerSecret = consumerSecret,
                AccessToken = accessToken,
                AccessTokenSecret = accessTokenSecret
            };

            var result = await _priceService.PublishToMagentoAsync(request, magentoConfig);
            return Ok(result);
        }

        /// <summary>
        /// Get statistics/dashboard data
        /// </summary>
        [HttpGet("stats")]
        public async Task<ActionResult> GetStats()
        {
            // Implement stats retrieval
            return Ok(new
            {
                pendingCount = 0,
                approvedCount = 0,
                publishedToday = 0,
                rejectedToday = 0
            });
        }
    }
}
```

---

## 10. Program.cs / Startup Configuration

```csharp
// Program.cs (.NET 6+)
using Microsoft.EntityFrameworkCore;
using PricingApi.Data;
using PricingApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database
builder.Services.AddDbContext<PricingDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Services
builder.Services.AddScoped<IPriceService, PriceService>();
builder.Services.AddHttpClient();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "http://localhost:3000",
            "https://your-frontend-domain.com"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

var app = builder.Build();

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();

// Auto-migrate database
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PricingDbContext>();
    db.Database.Migrate();
}

app.Run();
```

---

## 11. appsettings.json

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=your-server;Database=PricingDb;User Id=your-user;Password=your-password;TrustServerCertificate=True;"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

---

## 12. SQL Migration Script

```sql
-- Create Tables
CREATE TABLE PriceChanges (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Sku NVARCHAR(100) NOT NULL,
    ProductName NVARCHAR(500),
    StoreCode NVARCHAR(50) NOT NULL,
    StoreName NVARCHAR(100),
    OldBasePrice DECIMAL(18,4),
    NewBasePrice DECIMAL(18,4),
    OldSpecialPrice DECIMAL(18,4),
    NewSpecialPrice DECIMAL(18,4),
    OldSpecialPriceFrom DATETIME2,
    NewSpecialPriceFrom DATETIME2,
    OldSpecialPriceTo DATETIME2,
    NewSpecialPriceTo DATETIME2,
    VatRate DECIMAL(5,2) NOT NULL DEFAULT 0,
    Status INT NOT NULL DEFAULT 0,
    CreatedBy NVARCHAR(100) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ApprovedBy NVARCHAR(100),
    ApprovedAt DATETIME2,
    PublishedBy NVARCHAR(100),
    PublishedAt DATETIME2,
    RejectionReason NVARCHAR(500),
    Notes NVARCHAR(1000),
    BatchId NVARCHAR(50)
);

CREATE TABLE PriceChangeLogs (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    PriceChangeId INT NOT NULL,
    Action NVARCHAR(50) NOT NULL,
    PerformedBy NVARCHAR(100),
    PerformedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    Details NVARCHAR(1000),
    IpAddress NVARCHAR(50),
    FOREIGN KEY (PriceChangeId) REFERENCES PriceChanges(Id)
);

-- Indexes
CREATE INDEX IX_PriceChanges_Sku ON PriceChanges(Sku);
CREATE INDEX IX_PriceChanges_Status ON PriceChanges(Status);
CREATE INDEX IX_PriceChanges_BatchId ON PriceChanges(BatchId);
CREATE INDEX IX_PriceChanges_Sku_StoreCode ON PriceChanges(Sku, StoreCode);
CREATE INDEX IX_PriceChangeLogs_PriceChangeId ON PriceChangeLogs(PriceChangeId);
```

---

## Endpoints Riepilogo

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/prices/import` | Importa prezzi (salva come Pending) |
| GET | `/api/prices/pending` | Lista modifiche in attesa di approvazione |
| GET | `/api/prices/approved` | Lista modifiche approvate da pubblicare |
| GET | `/api/prices/history/{sku}` | Storico modifiche per SKU |
| GET | `/api/prices/batch/{batchId}` | Modifiche di un batch specifico |
| POST | `/api/prices/approve` | Approva modifiche selezionate |
| POST | `/api/prices/reject` | Rifiuta modifiche selezionate |
| POST | `/api/prices/publish` | Pubblica su Magento |
| GET | `/api/prices/stats` | Statistiche dashboard |

---

## NuGet Packages Necessari

```xml
<PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="8.0.0" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="8.0.0" />
<PackageReference Include="OAuth.DotNetCore" Version="3.0.1" />
<PackageReference Include="Swashbuckle.AspNetCore" Version="6.5.0" />
```
