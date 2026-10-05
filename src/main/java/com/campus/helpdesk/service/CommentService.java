package com.campus.helpdesk.service;

import com.campus.helpdesk.model.Comment;
import com.campus.helpdesk.model.User;
import com.campus.helpdesk.repository.CommentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class CommentService {

    @Autowired
    private CommentRepository commentRepository;

    public Comment addComment(Long ticketId, User author, String content) {
        if (content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("Comment content cannot be empty");
        }
        Comment comment = new Comment(ticketId, author, content.trim());
        return commentRepository.save(comment);
    }

    public List<Comment> getCommentsForTicket(Long ticketId) {
        return commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);
    }
}
