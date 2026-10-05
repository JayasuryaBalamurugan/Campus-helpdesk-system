package com.campus.helpdesk.service;

import com.campus.helpdesk.model.*;
import com.campus.helpdesk.repository.TicketRepository;
import com.campus.helpdesk.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class TicketService {

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private UserRepository userRepository;

    public Ticket createTicket(Ticket ticket, User creator) {
        ticket.setCreatedBy(creator);
        ticket.setStatus(Status.OPEN);
        return ticketRepository.save(ticket);
    }

    public List<Ticket> getAllTickets() {
        return ticketRepository.findAll();
    }

    public List<Ticket> getTicketsForUser(User user) {
        if (user.getRole() == Role.AGENT || user.getRole() == Role.ADMIN) {
            // Agents can see all tickets in the system
            return ticketRepository.findAll();
        } else {
            // Students and faculty can only see their own tickets
            return ticketRepository.findByCreatedBy(user);
        }
    }

    public Optional<Ticket> getTicketById(Long id) {
        return ticketRepository.findById(id);
    }

    public Ticket updateTicketStatus(Long ticketId, Status status) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        ticket.setStatus(status);
        return ticketRepository.save(ticket);
    }

    public Ticket updateTicketPriority(Long ticketId, Priority priority) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        ticket.setPriority(priority);
        return ticketRepository.save(ticket);
    }

    public Ticket assignTicket(Long ticketId, Long agentId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        
        if (agentId == null) {
            ticket.setAssignedTo(null);
        } else {
            User agent = userRepository.findById(agentId)
                    .orElseThrow(() -> new IllegalArgumentException("Agent not found"));
            if (agent.getRole() != Role.AGENT && agent.getRole() != Role.ADMIN) {
                throw new IllegalArgumentException("Assigned user must be an agent or admin");
            }
            ticket.setAssignedTo(agent);
        }
        return ticketRepository.save(ticket);
    }

    public Map<String, Long> getDashboardStats(User user) {
        List<Ticket> tickets = getTicketsForUser(user);
        
        long open = 0;
        long inProgress = 0;
        long resolved = 0;
        long closed = 0;
        
        for (Ticket t : tickets) {
            switch (t.getStatus()) {
                case OPEN -> open++;
                case IN_PROGRESS -> inProgress++;
                case RESOLVED -> resolved++;
                case CLOSED -> closed++;
            }
        }
        
        Map<String, Long> stats = new HashMap<>();
        stats.put("total", (long) tickets.size());
        stats.put("open", open);
        stats.put("inProgress", inProgress);
        stats.put("resolved", resolved);
        stats.put("closed", closed);
        
        return stats;
    }
}
