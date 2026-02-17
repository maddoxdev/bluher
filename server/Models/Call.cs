namespace VoipServer.Models;

public enum CallState
{
    Initiating,
    Ringing,
    Answered,
    Ended,
    Missed,
    Declined
}

public class Call
{
    public int Id { get; set; }
    public int CallerId { get; set; }
    public int CalleeId { get; set; }
    public CallState State { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AnsweredAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public string? SessionId { get; set; }
    
    public User? Caller { get; set; }
    public User? Callee { get; set; }
}
